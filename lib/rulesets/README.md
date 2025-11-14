# APA Ruleset System

A modular budgeting calculation system that supports both FlatRate and APA (Associated Production Agreement) overtime rules.

## Overview

The APA Ruleset System provides a flexible, composable architecture for applying different calculation logic to budget line items without changing the underlying data structure. This allows projects to switch between FlatRate and APA calculations dynamically.

## Architecture

### Core Components

1. **BudgetRuleset Interface** (`types.ts`)
   - Defines the contract all rulesets must implement
   - Methods: `calculateEstimate()`, `calculateOT()`, `getName()`

2. **FlatRateRuleset** (`FlatRateRuleset.ts`)
   - Traditional flat-rate overtime calculation
   - Formula: `(days × rate) + (ot1_5 × rate × 1.5) + (ot2 × rate × 2.0) + (ot2_5 × rate × 2.5)`
   - Uses fields: `days`, `rate`, `ot1_5`, `ot2`, `ot2_5`

3. **APARuleset** (`APARuleset.ts`)
   - Associated Production Agreement calculation
   - Uses Base Hourly Rate (BHR) = rate / 10
   - Tiered overtime multipliers based on daily rate
   - Uses fields: `days`, `rate`, `otHours`, `midnightHours`

4. **getRuleset() Helper** (`index.ts`)
   - Factory function to retrieve ruleset by name
   - Defaults to FlatRate if unknown ruleset specified

## Usage

### Basic Calculation

```typescript
import { getRuleset, LineItemData } from "@/lib/rulesets";

// Get ruleset from project
const ruleset = getRuleset(project.ruleset); // "FLAT_RATE" or "APA"

// Calculate estimate
const lineItem: LineItemData = {
  rate: 400,
  days: 5,
  ot1_5: 10, // For FlatRate
  otHours: 10, // For APA
};

const estimate = ruleset.calculateEstimate(lineItem);
const otCost = ruleset.calculateOT(lineItem);
```

### Using Utility Functions

```typescript
import { calculateEstimateWithRuleset } from "@/lib/utils";

// Automatic ruleset selection
const estimate = calculateEstimateWithRuleset(lineItem, project.ruleset);
```

## APA Calculation Rules

### Base Hourly Rate (BHR)

```
BHR = Daily Rate / 10
```

**Example:** If rate = $400/day, then BHR = $40/hour

### Overtime Multipliers (Tiered by Rate)

| Daily Rate | OT Multiplier | BHR Example | OT Cost (per hour) |
|------------|---------------|-------------|---------------------|
| ≤ $426     | 1.5x          | $42.60      | $63.90              |
| $427-$650  | 1.25x         | $50.00      | $62.50              |
| ≥ $651     | 1.0x          | $70.00      | $70.00              |

### General Overtime

```
General OT Cost = otHours × BHR × multiplier
```

Where multiplier is determined by the daily rate tier.

### Midnight Overtime

```
Midnight OT Cost = midnightHours × BHR × 3.0
```

Midnight overtime always uses a 3.0x multiplier, regardless of rate tier.

### Total Estimate

```
Total Estimate = (days × rate) + General OT + Midnight OT
```

## Database Schema

### Project Table

```sql
CREATE TYPE "BudgetRuleset" AS ENUM ('FLAT_RATE', 'APA');

ALTER TABLE "Project"
ADD COLUMN "ruleset" "BudgetRuleset" NOT NULL DEFAULT 'FLAT_RATE';
```

### BudgetLine Table

```sql
CREATE TYPE "LineItemUnit" AS ENUM ('DAY', 'HOUR', 'FLAT');

-- APA-specific fields
ALTER TABLE "BudgetLine"
ADD COLUMN "unit" "LineItemUnit",
ADD COLUMN "otHours" DECIMAL(10, 2),
ADD COLUMN "midnightHours" DECIMAL(10, 2),
ADD COLUMN "isAPA" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "rateSource" TEXT;
```

## Migration

**Important:** The schema migration must be run manually in Supabase SQL Editor due to pgbouncer limitations.

1. Open Supabase SQL Editor
2. Run the migration: `prisma/migrations/add-apa-ruleset-fields.sql`
3. Generate Prisma Client: `npx prisma generate`
4. Restart dev server

## Examples

### FlatRate Calculation

```typescript
const lineItem = {
  rate: 500,
  days: 5,
  ot1_5: 10,  // 10 hours at 1.5x
  ot2: 5,     // 5 hours at 2.0x
};

// Calculation:
// Base: 5 days × $500 = $2,500
// OT 1.5x: 10 hours × $500 × 1.5 = $7,500
// OT 2.0x: 5 hours × $500 × 2.0 = $5,000
// Total: $15,000

const estimate = calculateEstimateWithRuleset(lineItem, "FLAT_RATE");
// Result: 15000
```

### APA Calculation (Low Tier)

```typescript
const lineItem = {
  rate: 400,        // ≤ $426, so 1.5x multiplier
  days: 5,
  otHours: 10,      // General OT hours
  midnightHours: 2, // Midnight OT hours
};

// Calculation:
// BHR = $400 / 10 = $40/hour
// Base: 5 days × $400 = $2,000
// General OT: 10 hours × $40 × 1.5 = $600
// Midnight OT: 2 hours × $40 × 3.0 = $240
// Total: $2,840

const estimate = calculateEstimateWithRuleset(lineItem, "APA");
// Result: 2840
```

### APA Calculation (High Tier)

```typescript
const lineItem = {
  rate: 700,        // ≥ $651, so 1.0x multiplier
  days: 5,
  otHours: 10,      // General OT hours
  midnightHours: 2, // Midnight OT hours
};

// Calculation:
// BHR = $700 / 10 = $70/hour
// Base: 5 days × $700 = $3,500
// General OT: 10 hours × $70 × 1.0 = $700
// Midnight OT: 2 hours × $70 × 3.0 = $420
// Total: $4,620

const estimate = calculateEstimateWithRuleset(lineItem, "APA");
// Result: 4620
```

## UI Integration

### Rate Locking

When `isAPA = true`, the rate field should be locked:

```tsx
<input
  type="number"
  value={rate}
  disabled={isAPA}
  className={isAPA ? "bg-gray-100 cursor-not-allowed" : ""}
/>
{isAPA && (
  <p className="text-xs text-gray-500">
    This rate is set by APA
  </p>
)}
```

### Rate Override Warning

When a custom rate overrides APA:

```tsx
{isAPA && rateSource === "Custom" && (
  <div className="flex items-center gap-1 text-orange-600">
    <AlertTriangle className="w-4 h-4" />
    <span className="text-xs">This rate overrides APA standard</span>
  </div>
)}
```

### Rate Source Display

```tsx
<p className="text-xs text-gray-500">
  Source: {rateSource || "Custom"}
</p>
```

## Invoice Validation

When an invoice is submitted, validate the amount against the expected APA calculation:

```typescript
const expectedAmount = calculateEstimateWithRuleset(lineItem, project.ruleset);
const invoice = {
  amount: submittedAmount,
  status: Math.abs(submittedAmount - expectedAmount) > 1
    ? "rateMismatch"
    : "matched"
};
```

## Testing

### Unit Tests

```typescript
import { FlatRateRuleset, APARuleset } from "@/lib/rulesets";

// Test FlatRate
const flatRate = new FlatRateRuleset();
expect(flatRate.calculateEstimate({ rate: 500, days: 5 })).toBe(2500);

// Test APA Low Tier
const apa = new APARuleset();
expect(apa.calculateEstimate({
  rate: 400, // Low tier (1.5x)
  days: 5,
  otHours: 10
})).toBe(2600); // Base: 2000 + OT: 600
```

## Future Enhancements

1. **Additional Rulesets**
   - SAG (Screen Actors Guild) rates
   - Union-specific calculations
   - Custom client rulesets

2. **Rate Lookup**
   - APA rate card integration
   - Automatic rate suggestion by role
   - Historical rate tracking

3. **Compliance Checks**
   - Validate rates against APA minimums
   - Flag non-compliant line items
   - Generate compliance reports

## References

- [Associated Production Agreement](https://www.csatf.org/apa/)
- FlatRate System (legacy BidLine calculation)
