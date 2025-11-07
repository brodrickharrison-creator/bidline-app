# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BidLine is a production finance management application for film and video production companies. It helps production managers create budgets, track expenses, manage invoices, and monitor project finances throughout pre-production, production, and post-production phases.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **Icons**: Lucide React
- **Authentication**: NextAuth v5 (planned, not yet implemented)

## Development Commands

```bash
# Install dependencies (after fixing npm cache permissions)
npm install

# Run development server with Turbopack
npm run dev

# Build for production
npm build

# Start production server
npm start

# Lint code
npm run lint

# Database commands
npm run db:push      # Push schema changes to database
npm run db:studio    # Open Prisma Studio GUI
npm run db:generate  # Generate Prisma Client
```

## Architecture

### App Structure

The app uses Next.js App Router with a route group pattern:

```
app/
├── (dashboard)/          # Main authenticated app (uses dashboard layout)
│   ├── layout.tsx       # Sidebar layout wrapper
│   ├── dashboard/       # Financial overview page
│   ├── projects/        # Project list and creation
│   │   └── new/        # Budget creation form
│   ├── invoices/        # Invoice management
│   ├── contacts/        # Vendor/payee management
│   └── settings/        # User settings
├── layout.tsx           # Root layout (global styles, metadata)
└── page.tsx            # Root page (redirects to /dashboard)
```

### Database Schema

The Prisma schema models the production finance domain:

- **User**: Account information
- **Project**: Production with budget tracking (statuses: PLANNING, LIVE, COMPLETED, ARCHIVED)
- **BudgetLine**: Individual line items in a budget (PRE_PRODUCTION, PRODUCTION, POST_PRODUCTION)
- **Invoice**: Expense tracking with approval workflow (MISSING, WAITING_APPROVAL, APPROVED, FLAGGED, PAID)
- **Contact**: Vendors and payees

Key relationships:
- User has many Projects, Contacts
- Project has many BudgetLines, Invoices
- BudgetLine can have many Invoices (actuals tracking)
- Contact (payee) can have many Invoices

### Component Architecture

**Shared Components** (`components/`):
- `sidebar.tsx`: Main navigation with active state highlighting and quick stats

**Page Components**: Each route has its own page component with embedded UI. Future iterations should extract reusable components (cards, tables, forms) into `/components`.

### Styling Conventions

- Uses Tailwind utility classes
- Color scheme:
  - Primary actions: Blue (`bg-blue-600`)
  - Success/green: Projects, budgets (`bg-green-600`)
  - Warning/orange: Contacts, pending items (`text-orange-600`)
  - Info/purple: Invoices (`text-purple-600`)
- Consistent spacing: `p-8` for page padding, `gap-6` for grid layouts
- Rounded corners: `rounded-lg` for buttons/inputs, `rounded-xl` for cards

## Database Setup

1. Install PostgreSQL locally or use a hosted service
2. Copy `.env.example` to `.env`
3. Update `DATABASE_URL` with your PostgreSQL connection string
4. Run migrations:
   ```bash
   npm run db:push
   npm run db:generate
   ```

## Key Features to Implement

Based on the design screenshots, the following features need implementation:

### 1. Budget Builder
- Multi-category budget templates (Pre/Production/Post-production)
- Line item calculations with OT multipliers (1.5x, 2x, 2.5x)
- Real-time total calculation
- Template selection and custom categories

### 2. Project Detail Views
- **Estimate Tab**: Shows planned budget breakdown
- **Running Tab**: Shows actual invoices vs estimates with variance tracking
- Categorized line items (A/B/C sections for Pre/Production/Post)
- Invoice status tracking per line item

### 3. Invoice Management
- File upload functionality
- OCR/parsing for automatic data extraction (future enhancement)
- Approval workflow with status transitions
- Assignment to budget line items and payees
- Filtering and search

### 4. Financial Dashboard
- Real-time aggregation of project budgets
- Bank account integration (planned)
- Variance calculations across all projects
- Recent activity feed

### 5. Authentication
- NextAuth v5 integration needed
- User session management
- Protected routes

## NPM Cache Permission Issue

**Current Blocker**: There is a permission issue with the global npm cache that needs to be resolved:

```bash
sudo chown -R $(id -u):$(id -g) ~/.npm
```

After fixing permissions, run `npm install` to install all dependencies.

## Future Enhancements

- [ ] Invoice upload with drag-and-drop
- [ ] PDF generation for budgets
- [ ] Bank account integration via Plaid
- [ ] Real-time collaboration (multiple users editing budgets)
- [ ] Export to Excel/CSV
- [ ] Mobile responsive design
- [ ] Dark mode support
- [ ] AI-powered budget recommendations
- [ ] Email notifications for invoice approvals
