# Project Code Setup Instructions

This guide will help you add the `project_code` field to the Project table for invoice auto-matching.

## 📋 Overview

The `project_code` field is a producer-assigned unique identifier used for invoice auto-matching. Each project gets a unique code (unique per user) that will be used alongside payee email to automatically match uploaded invoices to the correct project and budget line.

**Key Features:**
- ✅ Required field on all projects
- ✅ Unique per user (different users can use the same project code)
- ✅ Indexed for fast lookup during invoice matching
- ✅ Used in combination with payee email for auto-matching

---

## 🚀 Setup Steps

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase project dashboard at https://supabase.com/dashboard
2. Select your BidLine project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New query**

### Step 2: Run Migration SQL

1. Open the file: `prisma/migrations/add-project-code.sql`
2. Copy the entire contents of the file
3. Paste into the SQL Editor
4. Click **Run** (or press Cmd/Ctrl + Enter)

You should see success messages indicating:
- ✅ Column added: `projectCode`
- ✅ Unique constraint created: `Project_userId_projectCode_key`
- ✅ Index created: `Project_projectCode_idx`

### Step 3: Verify Setup

Run this verification query in the SQL Editor:

```sql
-- Check that the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'Project' AND column_name = 'projectCode';

-- Check that indexes were created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'Project' AND indexname LIKE '%projectCode%';
```

You should see:
- 1 column: `projectCode` (text, not null)
- 2 indexes: unique constraint and lookup index

---

## 🔍 How Invoice Auto-Matching Will Work

When an invoice is uploaded (either internally or externally):

1. **Extract identifiers**:
   - Project code from invoice metadata
   - Payee email address

2. **Match to project**:
   - Find project where `projectCode` matches AND belongs to the authenticated user

3. **Match to budget line**:
   - Within that project, find budget line(s) where `payeeId` matches the contact with that email
   - If exactly 1 match found → auto-assign invoice to that line
   - If multiple matches found → flag for manual review (same payee on multiple lines)
   - If no match found → leave unassigned for manual matching

---

## 💡 Usage in the App

### Creating Projects

When creating a new project, you'll now need to provide a `project_code`:

```typescript
// Example in project creation form
const newProject = await createProject({
  name: "Summer Campaign 2025",
  projectCode: "SC2025", // Unique identifier
  clientName: "ABC Productions",
  userId: currentUser.id
});
```

### Project Code Format Recommendations

- **Short and memorable**: 3-8 characters
- **Alphanumeric**: Letters and numbers only
- **Unique per user**: No duplicates within your account
- **Examples**:
  - `SC2025` - Summer Campaign 2025
  - `PROJ-001` - Project 001
  - `ABC-MUSIC` - ABC Music Video
  - `DOC-2024` - Documentary 2024

---

## 🐛 Troubleshooting

### Error: "column does not exist"

**Cause**: Migration SQL has not been run yet

**Fix**:
1. Run the migration SQL in Supabase SQL Editor (see Step 2 above)
2. Restart your Next.js dev server

### Error: "duplicate key value violates unique constraint"

**Cause**: Trying to create two projects with the same `projectCode` for the same user

**Fix**:
- Choose a different project code
- Each project needs a unique code within your account
- Note: Different users CAN use the same code (uniqueness is per-user)

### Prisma Type Errors

**Symptom**: TypeScript shows `projectCode` as optional when it should be required

**Fix**:
1. Ensure you've run `npx prisma generate` (already done if you see this file)
2. Restart your IDE/editor
3. Hard refresh browser (Cmd/Ctrl + Shift + R)

---

## 🔄 Updating Existing Code

After running the migration, you'll need to update:

### 1. Project Creation Form (`/projects/new`)

Add a `projectCode` input field:

```typescript
<input
  type="text"
  name="projectCode"
  placeholder="e.g., SC2025"
  required
  maxLength={20}
  pattern="[A-Za-z0-9-_]+"
  title="Letters, numbers, hyphens and underscores only"
/>
```

### 2. Server Action (`app/actions/projects.ts`)

Update `createProject` to include `projectCode`:

```typescript
export async function createProject(data: {
  name: string;
  projectCode: string; // Required
  clientName?: string;
  userId: string;
}) {
  // Validation
  if (!data.projectCode || data.projectCode.trim().length === 0) {
    return { success: false, error: "Project code is required" };
  }

  // Check uniqueness
  const existing = await prisma.project.findFirst({
    where: {
      userId: data.userId,
      projectCode: data.projectCode
    }
  });

  if (existing) {
    return {
      success: false,
      error: "Project code already exists. Please choose a different code."
    };
  }

  // Create project
  const project = await prisma.project.create({
    data: {
      name: data.name,
      projectCode: data.projectCode,
      clientName: data.clientName,
      userId: data.userId,
      status: "PLANNING",
      totalBudget: 0,
      totalSpent: 0
    }
  });

  return { success: true, data: project };
}
```

### 3. Invoice Matching Logic (future implementation)

```typescript
export async function matchInvoiceToProject(
  invoiceId: string,
  projectCode: string,
  payeeEmail: string,
  userId: string
) {
  // Find project by code and user
  const project = await prisma.project.findFirst({
    where: {
      projectCode: projectCode,
      userId: userId
    },
    include: {
      budgetLines: {
        where: {
          payee: {
            email: payeeEmail
          }
        }
      }
    }
  });

  if (!project) {
    return { success: false, error: "Project not found" };
  }

  const matchingLines = project.budgetLines;

  if (matchingLines.length === 0) {
    // No matching payee - leave unassigned
    return { success: false, error: "No matching budget line found" };
  } else if (matchingLines.length === 1) {
    // Exactly one match - auto-assign
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        projectId: project.id,
        budgetLineId: matchingLines[0].id,
        status: "WAITING_APPROVAL"
      }
    });
    return { success: true, autoMatched: true };
  } else {
    // Multiple matches - flag for manual review
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        projectId: project.id,
        status: "FLAGGED" // Multiple possible lines
      }
    });
    return {
      success: true,
      autoMatched: false,
      message: "Multiple budget lines found - manual review required"
    };
  }
}
```

---

## ✅ Completion Checklist

- [ ] Ran `prisma/migrations/add-project-code.sql` in Supabase SQL Editor
- [ ] Verified column exists with correct constraints
- [ ] Verified indexes were created
- [ ] Updated project creation form to include project code input
- [ ] Updated `createProject` server action to handle project code
- [ ] Tested creating a new project with a project code
- [ ] Tested uniqueness constraint (try creating duplicate code)

---

## 📚 Next Steps

After completing this setup, you'll be ready to implement:

1. **Invoice metadata extraction** - Extract project code from uploaded invoices
2. **Auto-matching logic** - Match invoices to projects and budget lines
3. **Manual matching UI** - Handle cases where auto-matching can't determine the correct line

---

Need help? Check the BidLine documentation or open an issue on GitHub.
