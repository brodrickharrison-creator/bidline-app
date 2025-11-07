# BidLine Architecture Documentation

This document explains how BidLine is structured, how data flows through the application, and how everything connects together.

## Table of Contents

1. [Project Structure](#project-structure)
2. [Data Flow](#data-flow)
3. [Key Concepts](#key-concepts)
4. [Database Schema](#database-schema)
5. [Server Actions](#server-actions)
6. [Component Architecture](#component-architecture)
7. [Styling Conventions](#styling-conventions)
8. [Adding New Features](#adding-new-features)

---

## Project Structure

```
bidline-app/
├── app/                          # Next.js App Router pages
│   ├── (dashboard)/             # Route group with sidebar layout
│   │   ├── layout.tsx           # Sidebar wrapper for all dashboard pages
│   │   ├── dashboard/           # Financial overview page
│   │   ├── projects/            # Project management
│   │   │   ├── page.tsx        # Project list
│   │   │   ├── new/            # Create new project
│   │   │   └── [id]/           # Project detail (dynamic route)
│   │   ├── invoices/            # Invoice management
│   │   ├── contacts/            # Vendor/payee management
│   │   └── settings/            # User settings
│   ├── actions/                 # Server actions (API layer)
│   │   ├── projects.ts         # Project CRUD operations
│   │   ├── invoices.ts         # Invoice CRUD operations
│   │   ├── contacts.ts         # Contact CRUD operations
│   │   └── dashboard.ts        # Dashboard statistics
│   ├── layout.tsx               # Root layout (global styles)
│   └── page.tsx                # Root page (redirects to dashboard)
│
├── components/                   # Reusable React components
│   ├── ui/                      # Generic UI components
│   │   ├── StatusBadge.tsx     # Status indicator badges
│   │   └── StatCard.tsx        # Statistic display cards
│   └── sidebar.tsx              # Main navigation sidebar
│
├── lib/                          # Utility libraries
│   ├── prisma.ts               # Database client singleton
│   ├── constants.ts            # Application constants
│   └── utils.ts                # Helper functions
│
├── types/                        # TypeScript type definitions
│   └── index.ts                # All shared types
│
├── prisma/                       # Database configuration
│   └── schema.prisma           # Database schema definition
│
├── public/                       # Static assets
│
└── .env                         # Environment variables (not in git)
```

---

## Data Flow

### How Data Moves Through BidLine

1. **User Interaction**
   - User interacts with a page component (e.g., clicks "Create Project")

2. **Client Component**
   - Form collects user input
   - Validates data client-side
   - Calls a server action

3. **Server Action** (`app/actions/`)
   - Receives data from client
   - Validates data server-side
   - Uses Prisma to interact with database
   - Returns result to client

4. **Database** (PostgreSQL via Supabase)
   - Stores/retrieves data
   - Enforces constraints
   - Returns data to server action

5. **Client Updates**
   - Server action returns success/error
   - Component updates UI
   - Calls `revalidatePath()` to refresh cached data

### Example: Creating a Project

```
User fills form →
  CreateProjectForm collects data →
    Calls createProject() server action →
      Prisma creates project in database →
        Returns project ID →
          Form redirects to project detail page
```

---

## Key Concepts

### 1. Server Actions

Server actions are functions that run on the server but can be called directly from client components. They're defined with `"use server"` at the top of the file.

**Location:** `app/actions/`

**Purpose:** Handle all database operations and business logic

**Example:**
```typescript
"use server";

export async function createProject(data: CreateProjectFormData) {
  // This runs on the server
  const project = await prisma.project.create({ ... });
  return { success: true, projectId: project.id };
}
```

### 2. Client Components

Components that need interactivity (state, event handlers, effects) must be marked with `"use client"`.

**When to use:**
- Forms with input handling
- Components with useState/useEffect
- Components that respond to user events

**Example:**
```typescript
"use client";

export default function ProjectForm() {
  const [name, setName] = useState("");
  // ... rest of component
}
```

### 3. Server Components

Components without `"use client"` are server components. They can fetch data directly and don't include JavaScript in the browser bundle.

**Best for:**
- Data fetching
- Static content
- Initial page loads

### 4. Route Groups

Folders with parentheses like `(dashboard)` are route groups. They organize code without affecting the URL structure.

**Example:**
- File: `app/(dashboard)/projects/page.tsx`
- URL: `/projects` (not `/dashboard/projects`)
- Uses: `app/(dashboard)/layout.tsx` for sidebar

---

## Database Schema

### Core Models

#### User
- **Purpose:** User account information
- **Relations:** Has many Projects and Contacts
- **Note:** Currently using temp user until auth is implemented

#### Project
- **Purpose:** A production with a budget
- **Key Fields:**
  - `name`: Project name
  - `clientName`: Client name
  - `status`: PLANNING | LIVE | COMPLETED | ARCHIVED
  - `totalBudget`: Sum of all budget line estimates
  - `totalSpent`: Sum of approved/paid invoice amounts
- **Relations:**
  - Has many BudgetLines
  - Has many Invoices

#### BudgetLine
- **Purpose:** Individual line item in a project budget
- **Key Fields:**
  - `category`: PRE_PRODUCTION | PRODUCTION | POST_PRODUCTION
  - `lineNumber`: Display order
  - `days`, `rate`: Base calculation values
  - `ot1_5`, `ot2`, `ot2_5`: Overtime hours
  - `estimate`: Calculated total for this line
  - `actualSpent`: Sum of approved/paid invoices for this line
- **Relations:**
  - Belongs to Project
  - Has many Invoices
  - Has one Contact (payee)

#### Invoice
- **Purpose:** Expense record
- **Key Fields:**
  - `amount`: Invoice amount
  - `status`: MISSING | WAITING_APPROVAL | APPROVED | FLAGGED | PAID
  - `invoiceNumber`: Reference number (optional)
- **Relations:**
  - Belongs to Project
  - Belongs to BudgetLine (optional)
  - Belongs to Contact as payee (optional)

#### Contact
- **Purpose:** Vendor/payee information
- **Key Fields:**
  - `name`: Contact name
  - `email`, `phone`: Contact info (optional)
- **Relations:**
  - Belongs to User
  - Has many Invoices
  - Has many BudgetLines (as assigned payee)

### Relationship Diagram

```
User
  ├─ Projects
  │   ├─ BudgetLines
  │   │   ├─ Invoices
  │   │   └─ Payee (Contact)
  │   └─ Invoices
  └─ Contacts
```

---

## Server Actions

All server actions follow a consistent pattern for maintainability.

### Standard Pattern

```typescript
"use server";

export async function actionName(input: InputType) {
  try {
    // 1. Validate input (if needed)
    if (!input.requiredField) {
      return { success: false, error: "Validation message" };
    }

    // 2. Perform database operation
    const result = await prisma.model.operation({ ... });

    // 3. Update related data (if needed)
    // e.g., recalculate totals

    // 4. Revalidate affected pages
    revalidatePath("/relevant-page");

    // 5. Return success
    return { success: true, data: result };

  } catch (error) {
    console.error("Action failed:", error);
    return { success: false, error: "User-friendly message" };
  }
}
```

### Important Server Actions

#### `createProject()`
- **File:** `app/actions/projects.ts`
- **Purpose:** Creates a new project with budget lines
- **Logic:**
  - Calculates total budget from line items
  - Creates project and all budget lines in one transaction
  - Revalidates projects list

#### `createInvoice()`
- **File:** `app/actions/invoices.ts`
- **Purpose:** Creates a new invoice
- **Logic:**
  - Creates invoice record
  - If status is APPROVED or PAID, updates project/budget line totals
  - Revalidates invoices and project pages

#### `updateInvoiceStatus()`
- **File:** `app/actions/invoices.ts`
- **Purpose:** Changes invoice status
- **Logic:**
  - Updates status
  - If changing to/from APPROVED/PAID, recalculates totals
  - Revalidates affected pages

#### `assignBudgetLinePayee()`
- **File:** `app/actions/projects.ts`
- **Purpose:** Assigns a contact to a budget line
- **Logic:**
  - Updates budget line payeeId
  - Revalidates project pages

---

## Component Architecture

### Page Components

Page components are the entry points for routes. They should:
1. Fetch data using server actions
2. Handle loading and error states
3. Render UI using smaller components

**Example:**
```typescript
"use client";

export default function ProjectDetailPage() {
  const [project, setProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProject();
  }, []);

  const loadProject = async () => {
    const data = await getProjectById(id);
    setProject(data);
    setIsLoading(false);
  };

  if (isLoading) return <div>Loading...</div>;
  if (!project) return <div>Not found</div>;

  return <div>{/* Render project details */}</div>;
}
```

### Reusable Components

Extract repeated UI patterns into components:

- **StatusBadge:** For displaying project/invoice status
- **StatCard:** For displaying financial statistics
- **Forms:** Extract common form patterns
- **Tables:** Extract table layouts

---

## Styling Conventions

### Tailwind CSS

BidLine uses Tailwind utility classes for all styling.

### Color System

- **Primary (Blue):** Primary actions, project status
- **Success (Green):** Approved items, positive variance, projects
- **Warning (Orange):** Contacts, pending items
- **Error (Red):** Errors, negative variance, flagged items
- **Info (Purple):** Invoices

### Component Styling

```typescript
// Card pattern
<div className="bg-white rounded-xl p-6 border border-gray-200">

// Button pattern (primary)
<button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">

// Input pattern
<input className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
```

---

## Adding New Features

### Step-by-Step Guide

#### 1. Plan the Database Schema
- Do you need new tables?
- Do you need new fields in existing tables?
- Update `prisma/schema.prisma`
- Run `npx prisma db push`

#### 2. Define Types
- Add TypeScript types to `types/index.ts`
- Define input types, output types, and API responses

#### 3. Create Server Actions
- Add new file in `app/actions/` if needed
- Follow the standard server action pattern
- Handle errors gracefully
- Revalidate affected paths

#### 4. Create UI Components
- Create page component in appropriate `app/` folder
- Extract reusable pieces into `components/`
- Use existing UI components when possible

#### 5. Update Constants
- Add new constants to `lib/constants.ts`
- Update utility functions in `lib/utils.ts` if needed

#### 6. Test
- Test happy path
- Test error cases
- Test database updates
- Test revalidation

### Example: Adding Project Notes Feature

1. **Database:**
   ```prisma
   model ProjectNote {
     id        String   @id @default(cuid())
     content   String
     projectId String
     project   Project  @relation(...)
     createdAt DateTime @default(now())
   }
   ```

2. **Types:**
   ```typescript
   export interface ProjectNote {
     id: string;
     content: string;
     projectId: string;
     createdAt: Date;
   }
   ```

3. **Server Action:**
   ```typescript
   export async function createProjectNote(projectId: string, content: string) {
     // ... implementation
   }
   ```

4. **UI:** Create `NotesSection` component in project detail page

---

## Questions?

If you're unsure about how something works:

1. Look for similar patterns in existing code
2. Check this documentation
3. Review the constants and types files
4. Look at the database schema

The codebase is organized to be self-documenting. Follow existing patterns and conventions.
