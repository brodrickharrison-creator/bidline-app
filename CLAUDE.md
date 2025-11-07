# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BidLine is a production finance management application for film and video production companies. It helps production managers create budgets, track expenses, manage invoices, and monitor project finances throughout pre-production, production, and post-production phases.

## Tech Stack

- **Framework**: Next.js 15 (App Router with Turbopack)
- **Language**: TypeScript
- **Database**: PostgreSQL (via Supabase) with Prisma ORM
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Authentication**: NextAuth v5 (planned, not yet implemented)

## Development Commands

```bash
# Install dependencies
npm install

# Run development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Database commands
npx prisma db push      # Push schema changes to database
npx prisma studio       # Open Prisma Studio GUI at http://localhost:5555
npx prisma generate     # Generate Prisma Client after schema changes
```

## Database Setup

Using Supabase with Transaction Pooler:

1. Create `.env` file with:
   ```env
   DATABASE_URL="postgresql://user:password@host:6543/database?pgbouncer=true"
   ```
   **Important**: Use port `6543` (Transaction Pooler) and include `?pgbouncer=true`

2. Push schema and generate client:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

## Architecture

### Route Structure

```
app/
├── (dashboard)/              # Authenticated routes with sidebar layout
│   ├── layout.tsx           # Sidebar navigation wrapper
│   ├── dashboard/           # Financial overview & stats
│   ├── projects/            # Project list and budget management
│   │   ├── new/            # Budget creation form
│   │   └── [id]/           # Project detail with Estimate/Running tabs
│   ├── invoices/            # Invoice management
│   │   ├── new/            # Internal invoice upload (producer use)
│   │   ├── match/          # Match unassigned invoices to line items
│   │   └── [id]/           # Invoice detail view
│   ├── contacts/            # Vendor/payee management
│   └── settings/            # User preferences
├── upload/                   # External invoice upload (public-facing)
├── actions/                  # Server actions (API layer)
│   ├── projects.ts          # Project & budget line CRUD
│   ├── invoices.ts          # Invoice CRUD & matching logic
│   ├── external-upload.ts   # Public invoice submission
│   ├── contacts.ts          # Contact management
│   └── dashboard.ts         # Dashboard statistics
├── layout.tsx               # Root layout with global styles
└── page.tsx                 # Root redirect to /dashboard
```

### Database Schema

**Core Models:**
- **User**: Account owner (future authentication)
- **Project**: Production with budget tracking
  - Status: PLANNING → LIVE → COMPLETED → ARCHIVED
  - Tracks: `totalBudget`, `totalSpent`
- **BudgetLine**: Individual line items in project budget
  - Categories: PRE_PRODUCTION, PRODUCTION, POST_PRODUCTION
  - Tracks: `estimate`, `runningAmount` (manual entry), `actualSpent` (calculated from invoices)
  - Optional payee assignment for invoice matching
- **Invoice**: Expense records with approval workflow
  - Status: MISSING → WAITING_APPROVAL → APPROVED/FLAGGED → PAID
  - Can be unassigned (null `projectId`/`budgetLineId`) until manually matched
- **Contact**: Vendors/payees for invoice matching

**Key Relationships:**
- User → Projects, Contacts (one-to-many)
- Project → BudgetLines, Invoices (one-to-many, cascade delete)
- BudgetLine → Invoices (one-to-many for actuals tracking)
- BudgetLine → Contact (payee assignment for invoice suggestions)
- Contact → Invoices (payee identification)

### Invoice Workflow Architecture

**Two-Phase Invoice System:**

1. **External Upload** (`/upload` - public, no auth):
   - Vendors submit: email, amount, invoice number (optional)
   - System finds Contact by email
   - Creates Invoice with null `projectId`/`budgetLineId` (unassigned)
   - Status: WAITING_APPROVAL

2. **Producer Matching** (`/invoices/match` - internal):
   - Lists all unassigned invoices (where `projectId` is null)
   - For selected invoice, suggests BudgetLines where payee is assigned
   - Producer reviews and assigns to correct line item
   - Updates `projectId`, `budgetLineId`, recalculates spent amounts

**Server Actions:**
- `uploadExternalInvoice()` - Public invoice submission
- `getUnmatchedInvoices()` - Fetch invoices with null projectId
- `getSuggestedLineItems()` - Find budget lines by payee email
- `assignInvoiceToLineItem()` - Assign invoice and update actuals

### Critical: Prisma Decimal Serialization

**Problem**: Prisma `Decimal` type cannot be serialized to client components directly.

**Solution**: All server actions MUST explicitly convert Decimal fields to numbers:

```typescript
// ❌ BAD - Will cause serialization error
return await prisma.project.findMany();

// ✅ GOOD - Explicit field mapping
const projects = await prisma.project.findMany();
return projects.map(p => ({
  id: p.id,
  name: p.name,
  totalBudget: Number(p.totalBudget),  // Convert Decimal
  totalSpent: Number(p.totalSpent),    // Convert Decimal
  // ... map all fields explicitly
}));
```

**Pattern used in all action files:**
- Fetch raw data from Prisma
- Map to new object with `Number()` conversions
- Return converted object to client

### Spent Amount Calculations

**Automatic Updates**: When invoice status changes to APPROVED or PAID:

1. `updateProjectSpent()` - Sums all approved/paid invoice amounts for project
2. `updateBudgetLineSpent()` - Sums all approved/paid invoice amounts for line item
3. Variance calculated client-side: `estimate - actualSpent`

**Status-Based Logic**: Only invoices with status APPROVED or PAID count toward actuals.

### Color Coding Conventions

Consistent Tailwind color scheme:
- **Purple** (`purple-600`): Invoices, primary invoice actions
- **Orange** (`orange-600`): Contacts, unmatched items, warnings
- **Blue** (`blue-600`): Planning status, approved invoices
- **Green** (`green-600`): Live status, paid invoices, positive variance
- **Red** (`red-600`): Flagged invoices, negative variance
- **Gray** (`gray-600`): Missing/archived status

### Reusable Components

**Shared Components** (`components/`):
- `sidebar.tsx`: Main navigation with active route highlighting and quick stats

**Pattern**: Most UI is embedded in page components. Future refactoring should extract cards, tables, forms to `/components`.

## Key Patterns

### Server Actions

All database operations use server actions with `"use server"` directive:

```typescript
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function myAction(input: MyInput) {
  // 1. Perform database operation
  const result = await prisma.model.create({ data: input });

  // 2. Convert Decimal fields
  const converted = {
    id: result.id,
    amount: Number(result.amount),  // Always convert Decimals
    // ... explicit field mapping
  };

  // 3. Revalidate affected routes
  revalidatePath("/affected-route");

  return { success: true, data: converted };
}
```

### Client Component State Management

Pattern for list pages (invoices, projects, contacts):

```typescript
"use client";

export default function ListPage() {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadItems();
  }, [dependencies]);

  const loadItems = async () => {
    setIsLoading(true);
    const data = await getItems();  // Server action
    setItems(data);
    setIsLoading(false);
  };

  // Render with loading, empty, and data states
}
```

### Budget Calculation Formula

Line item estimate:
```
(days × rate) + (ot1.5 × rate × 1.5) + (ot2 × rate × 2) + (ot2.5 × rate × 2.5)
```

Implemented in budget creation form with real-time calculation.

### Inline Editing Pattern

For editable table cells (e.g., Running column in project budget):

```typescript
const [editingId, setEditingId] = useState<string | null>(null);
const [value, setValue] = useState<string>("");
const [isSaving, setIsSaving] = useState(false);

// Click to edit
const handleClick = (item: any) => {
  setEditingId(item.id);
  setValue(item.fieldValue ? String(item.fieldValue) : "");
};

// Save with explicit confirmation
const handleSave = async (id: string) => {
  setIsSaving(true);
  await updateAction(id, parseFloat(value));
  setIsSaving(false);
  setEditingId(null);
};

// Render: Show input with check/cancel buttons when editing
{editingId === item.id ? (
  <div className="flex gap-2">
    <input value={value} onChange={(e) => setValue(e.target.value)} />
    <button onClick={() => handleSave(item.id)}>
      <Check className="w-4 h-4" />
    </button>
    <button onClick={() => setEditingId(null)}>
      <X className="w-4 h-4" />
    </button>
  </div>
) : (
  <button onClick={() => handleClick(item)}>
    {item.fieldValue || "-"}
  </button>
)}
```

**Key UX Points:**
- Explicit save/cancel buttons (green check, red X)
- Support Enter to save, Escape to cancel
- Disable inputs/buttons while saving
- Click away from input doesn't auto-save (prevents accidental data loss)

## Common Troubleshooting

### Decimal Serialization Errors

**Symptom**: `Error: Only plain objects can be passed to Client Components from Server Components`

**Cause**: Returning raw Prisma query results with Decimal types

**Fix**: Add explicit field mapping with `Number()` conversion in server action

### Database Connection Issues

**Symptom**: "Can't reach database server"

**Fix**:
1. Check Supabase dashboard - resume if paused
2. Verify `.env` uses Transaction Pooler (port 6543)
3. Ensure `?pgbouncer=true` in connection string

### Prepared Statement Errors

**Symptom**: "Prepared statement X does not exist"

**Fix**: Add `?pgbouncer=true` to `DATABASE_URL`

### Unknown Argument Errors After Schema Changes

**Symptom**: `Unknown argument 'fieldName'. Available options are marked with ?.`

**Cause**: Prisma Client not regenerated after schema changes

**Fix**:
1. Ensure database has the new column (via `npx prisma db push` or manual SQL)
2. Regenerate Prisma Client: `npx prisma generate`
3. Restart dev server to pick up new client
4. Hard refresh browser (Cmd/Ctrl + Shift + R)

## Development Workflow

1. Start dev server: `npm run dev`
2. Open Prisma Studio (optional): `npx prisma studio`
3. Make changes - hot reload enabled
4. If schema changes:
   - Update `prisma/schema.prisma`
   - Run `npx prisma db push`
   - Run `npx prisma generate`
   - Restart dev server

## Adding New Features

See `ARCHITECTURE.md` for detailed guide. Quick steps:

1. Update database schema if needed
2. Create/update server actions with Decimal conversion
3. Build page components with proper loading/error states
4. Use consistent color coding and spacing
5. Revalidate affected paths in server actions
