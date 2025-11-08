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
- **PDF Generation**: jsPDF with autoTable plugin
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
npm run db:push         # Push schema changes to database
npm run db:studio       # Open Prisma Studio GUI at http://localhost:5555
npm run db:generate     # Generate Prisma Client after schema changes
npm run db:seed         # Seed database with line item templates (276 items)

# Or use npx directly
npx prisma db push
npx prisma studio
npx prisma generate
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
│   │   ├── page.tsx        # Project cards with delete functionality
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
│   ├── projects.ts          # Project & budget line CRUD, deletion, PDF export
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
- **LineItemTemplate**: Template library for budget line items
  - Contains 276 predefined roles across 16 categories (CAMERA, ART, ELECTRIC, etc.)
  - Seeded from CSV file via `npm run db:seed`
  - Used to populate new projects with empty budget lines
- **BudgetLine**: Individual line items in project budget
  - Dynamic categories (stored as strings, not enum) - matches template categories
  - Fields: `quantity`, `days`, `rate`, `ot1_5`, `ot2`, `ot2_5`, `estimate`, `runningAmount`, `actualSpent`
  - All numeric fields are nullable - only lines with at least one filled field are shown in views
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

### Line Item Template System

**Architecture**: Dynamic template-based budget creation system

**Template Storage:**
- 276 line item templates stored in `LineItemTemplate` table
- Organized by category (e.g., CAMERA, ART, ELECTRIC, GRIP, SOUND, etc.)
- Each template has: `category`, `role`, `isDefault`, `sortOrder`
- Seeded from `prisma/line_item_templates_seed.csv`

**Project Creation Flow:**
1. User creates new project at `/projects/new`
2. Page loads all templates via `getDefaultLineItemTemplates()` server action
3. Each template becomes a `BudgetLine` with null values for quantity, days, rate, OT fields
4. All 276 lines are saved to database but hidden until user fills in data

**Visibility Logic:**
- Estimate/Running views filter lines using `hasFilledData()` function
- Only shows lines where at least one field (quantity, days, rate, ot1_5, ot2, ot2_5) is not null
- Categories without any filled lines are completely hidden
- "+ Add Line" dropdown dynamically populates from template categories

**Dynamic Categories:**
- `BudgetLine.category` is a `String` (not enum) to support flexible template categories
- Categories are extracted dynamically from templates, not hardcoded
- All views (Create, Estimate, Running, PDF Export) iterate over dynamic category list
- Category dropdown in filter controls populated from actual template data

**Server Actions:**
- `getDefaultLineItemTemplates()` - Fetch all templates where `isDefault = true`
- `getTemplatesByCategory(category)` - Fetch templates for specific category
- `getAllTemplateCategories()` - Get unique category list for filters

**Adding Custom Templates:**
1. Add rows to `line_item_templates_seed.csv`
2. Run `npm run db:seed` to repopulate templates
3. New templates automatically appear in create project flow

### Invoice Workflow Architecture

**Two-Phase Invoice System:**

1. **External Upload** (`/upload` - public, no auth):
   - Vendors submit: email, amount, invoice number (optional), file upload
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

### Budget Calculation Formula

Line item estimate:
```
estimate = (days * rate) + (ot1.5 * rate * 1.5) + (ot2 * rate * 2) + (ot2.5 * rate * 2.5)
```

**Note**: The `quantity` field exists in the schema but is NOT used in estimate calculations. It's for informational purposes only (e.g., "3 cameras").

**Implementation locations:**
- Utility function: `calculateBudgetLineEstimate()` in `/lib/utils.ts`
- Budget creation form: `/app/(dashboard)/projects/new/page.tsx`
- Estimate tab: `/app/(dashboard)/projects/[id]/page.tsx`
- Server action: `updateBudgetLineFields` in `/app/actions/projects.ts`

### Spent Amount Calculations

**Automatic Updates**: When invoice status changes to APPROVED or PAID:

1. `updateProjectSpent()` - Sums all approved/paid invoice amounts for project
2. `updateBudgetLineSpent()` - Sums all approved/paid invoice amounts for line item
3. Variance calculated client-side: `estimate - actualSpent`

**Status-Based Logic**: Only invoices with status APPROVED or PAID count toward actuals.

### Project Management Features

**Estimate View** (`/projects/[id]?tab=estimate`):
- All budget line fields are editable (name, quantity, days, rate, OT fields)
- Click "Edit" button → inline editing with green checkmark to save, red X to cancel
- "+ Add Line" button in each category section to add new budget lines
- "Export Bid PDF" button generates professional PDF for client approval
- Estimate values update live as fields are edited

**Running View** (`/projects/[id]?tab=running`):
- Running column is editable for manual forecasting
- Payee assignment for budget lines
- Invoice status badges (clickable to view invoice details)
- Quantity column is hidden (forecasting view doesn't need bid structure)

**Project Deletion**:
- Three-dot menu icon on project cards
- Confirmation modal with warning about cascade deletion
- Deletes project, all budget lines, and all invoices

### PDF Export Functionality

**Location**: Estimate View tab, "Export Bid PDF" button

**Generated PDF includes:**
- Header: Project name, client name, prepared by, date
- Category-organized tables with all estimate columns
- Professional formatting with green headers
- Estimated total at bottom
- Auto-named: `ProjectName_Estimate.pdf`

**Libraries**: jsPDF and jspdf-autotable

### Color Coding Conventions

Consistent Tailwind color scheme across the application:
- **Purple** (`purple-600`): Invoices, primary invoice actions, running edits
- **Orange** (`orange-600`): Contacts, unmatched items, warnings, missing invoices
- **Blue** (`blue-600`): Planning status, paid invoices, PDF export button
- **Green** (`green-600`): Live status, projects, positive variance, add buttons, save buttons, approved invoices
- **Red** (`red-600`): Flagged invoices, negative variance, delete actions, cancel buttons
- **Yellow** (`yellow-600`): Waiting approval status
- **Gray** (`gray-600`): Completed/archived status, neutral states

**Status Badge Colors (from constants.ts):**
- Project: Planning=blue, Live=green, Completed/Archived=gray
- Invoice: Missing=orange, Waiting=yellow, Approved=green, Flagged=red, Paid=blue

### Reusable Components

**Shared Components** (`components/`):
- `sidebar.tsx`: Main navigation with active route highlighting and quick stats

**Pattern**: Most UI is embedded in page components. Future refactoring should extract cards, tables, forms to `/components`.

### UI Design Patterns

**Unified Spreadsheet Design**:
BidLine uses a consistent spreadsheet-style table layout across all budget views (Create, Estimate, Running). Key implementation:

```typescript
// Wrapper with rounded corners and overflow handling
<div className="overflow-hidden border border-gray-300 rounded-lg">
  <div className="overflow-x-auto">
    <table className="w-full text-sm border-collapse">
      <thead className="bg-gray-100 border-b border-gray-300">
        {/* Fixed header with vertical dividers */}
        <th className="px-3 py-2 ... border-r border-gray-300">Column</th>
      </thead>
      <tbody>
        {/* Category header rows integrated into table */}
        <tr className="bg-gray-50 border-t border-gray-300">
          <td className="px-3 py-2 font-semibold border-r border-gray-300">A</td>
          <td colSpan={9} className="px-3 py-2 font-semibold">Pre-Production Labor</td>
        </tr>
        {/* Line item rows with vertical dividers */}
        <tr className="border-t border-gray-200 hover:bg-gray-50">
          <td className="px-3 py-2 border-r border-gray-300">...</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

**Critical**:
- Outer `overflow-hidden` div clips table borders to rounded corners
- Inner `overflow-x-auto` div enables horizontal scrolling
- All cells need `border-r border-gray-300` for complete grid lines
- Category headers use `colSpan` to span across columns
- Use `border-collapse` on table for clean border rendering

**Segmented Tab Control**:
Modern tab navigation pattern used in project detail views:

```typescript
<div className="inline-flex bg-gray-100 rounded-lg p-1">
  <Link
    href={`/projects/${projectId}?tab=estimate`}
    className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
      activeTab === "estimate"
        ? "bg-white text-gray-900 shadow-sm"
        : "text-gray-600 hover:text-gray-900"
    }`}
  >
    Estimate
  </Link>
  {/* More tabs... */}
</div>
```

**Key conventions**:
- Use URL query parameters for tab state, not component state
- Active tab: white background with subtle shadow
- Inactive tabs: gray text with hover effect
- Container has gray background with padding for segmented appearance

**Custom Dropdown Styling**:
For consistent cross-browser dropdown appearance, use custom SVG arrows instead of native browser arrows:

```typescript
<select
  className="pl-4 pr-10 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22M6%208l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.5em] bg-[right_0.5rem_center] bg-no-repeat w-[160px] shrink-0"
>
  <option>All</option>
  {/* ... */}
</select>
```

**Responsive Search/Filter Layout**:
For paired search and filter controls that span the page:

```typescript
<div className="flex gap-4 mb-6">
  <div className="flex-1 relative">
    {/* Search input with flex-1 to fill available space */}
    <input type="text" className="w-full ..." />
  </div>
  {/* Filter dropdown with fixed width and shrink-0 */}
  <select className="w-[160px] shrink-0 ...">
</div>
```

**Modal Confirmation Pattern**:
For destructive actions (delete, archive), use confirmation modals with clear warnings:

```typescript
{showConfirm && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Item?</h3>
      <p className="text-gray-600 mb-6">
        Explain consequences. This action cannot be undone.
      </p>
      <div className="flex gap-3 justify-end">
        <button className="...gray...">Cancel</button>
        <button className="...red...">Delete Item</button>
      </div>
    </div>
  </div>
)}
```

## Code Organization

### Utilities and Constants

**Centralized helpers** (`lib/`):
- `constants.ts` - All magic strings, status labels, colors, routes, multipliers
- `utils.ts` - Formatting, calculations, validation functions
- `prisma.ts` - Database client singleton

**Type definitions** (`types/index.ts`):
- All shared TypeScript types
- Avoids `any` types throughout the codebase
- Imports Prisma enums for type safety

**Pattern**: Always check these files before hardcoding values or creating duplicate functions.

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
  }, []);

  const loadItems = async () => {
    setIsLoading(true);
    const data = await getItems();  // Server action
    setItems(data);
    setIsLoading(false);
  };

  // Render with loading, empty, and data states
}
```

### Performance Optimization with React.memo

**Problem**: Re-rendering performance issues when updating individual items in lists

**Solution**: Memoize list item components to prevent unnecessary re-renders

```typescript
import { memo, useCallback } from "react";

// Memoized component with scoped state
const ItemCard = memo(({
  item,
  onUpdate,
  onDelete
}: {
  item: any;
  onUpdate: (id: string, data: any) => void;
  onDelete: (id: string) => void;
}) => {
  const [localState, setLocalState] = useState(false);
  // Component-scoped state prevents re-renders of other items
  // ...
});

ItemCard.displayName = "ItemCard";

// In parent component, use useCallback for stable references
export default function ParentPage() {
  const handleUpdate = useCallback(async (id: string, data: any) => {
    // Update logic
  }, []);

  return items.map(item => (
    <ItemCard key={item.id} item={item} onUpdate={handleUpdate} />
  ));
}
```

**Example usage**: Projects page (`/app/(dashboard)/projects/page.tsx:9-145`)

### Inline Editing Pattern

For editable table cells (used in Estimate and Running views):

```typescript
const [editingId, setEditingId] = useState<string | null>(null);
const [editValues, setEditValues] = useState<Record<string, any>>({});
const [isSaving, setIsSaving] = useState(false);

// Click to edit
const handleEditClick = (item: any) => {
  setEditingId(item.id);
  setEditValues({ field1: item.field1, field2: item.field2 });
};

// Save with explicit confirmation
const handleSave = async (id: string) => {
  setIsSaving(true);
  await updateAction(id, editValues);
  setIsSaving(false);
  setEditingId(null);
  setEditValues({});
};

// Update value handler
const updateEditValue = (field: string, value: string) => {
  if (field === "name") {
    setEditValues({ ...editValues, [field]: value });
  } else {
    setEditValues({ ...editValues, [field]: parseFloat(value) || 0 });
  }
};

// Render: Show input with check/cancel buttons when editing
{editingId === item.id ? (
  <div className="flex gap-2">
    <input
      value={editValues.field1}
      onChange={(e) => updateEditValue("field1", e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") handleSave(item.id);
        if (e.key === "Escape") setEditingId(null);
      }}
    />
    <button onClick={() => handleSave(item.id)} disabled={isSaving}>
      <Check className="w-4 h-4" />
    </button>
    <button onClick={() => setEditingId(null)} disabled={isSaving}>
      <X className="w-4 h-4" />
    </button>
  </div>
) : (
  <button onClick={() => handleEditClick(item)}>
    {item.field1 || "-"}
  </button>
)}
```

**Key UX Points:**
- Explicit save/cancel buttons (green check, red X)
- Support Enter to save, Escape to cancel
- Disable inputs/buttons while saving
- Click away from input doesn't auto-save (prevents accidental data loss)
- Separate handlers for text fields vs numeric fields

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

### Input Field Not Editable (Create Project / Add Line)

**Symptom**: New line items added via "+ Add Line" have non-editable fields

**Cause**: `updateLine` function parsing all values as numbers, including text fields

**Fix**: Handle `name` field separately in the update handler:
```typescript
const updateLine = (id: string, field: keyof BudgetLine, value: string | number) => {
  setBudgetLines((lines) =>
    lines.map((line) => {
      if (line.id !== id) return line;

      // Handle name field as string, numeric fields as numbers
      if (field === "name") {
        return { ...line, [field]: value };
      } else {
        return { ...line, [field]: typeof value === "string" ? parseFloat(value) || 0 : value };
      }
    })
  );
};
```

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

Quick steps:

1. **Check for existing utilities** - Review `lib/constants.ts`, `lib/utils.ts`, and `types/index.ts` before creating new helpers
2. **Update database schema** if needed (`prisma/schema.prisma`)
   - Run `npx prisma db push` to apply changes
   - Run `npx prisma generate` to regenerate client
3. **Add TypeScript types** to `types/index.ts` for new models/inputs
4. **Create/update server actions** with Decimal conversion (`app/actions/`)
   - Always convert Decimal fields to numbers
   - Revalidate affected paths
5. **Build page components** with proper loading/error states
   - Use consistent color coding (see Color Coding Conventions)
   - For lists with interactive items, use React.memo pattern
   - For editable fields, use inline editing pattern with explicit save/cancel
6. **Update constants** if adding new status types, routes, or labels
