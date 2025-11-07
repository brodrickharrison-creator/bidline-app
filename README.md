# BidLine - Production Finance Management

A modern web application for managing film and video production budgets, invoices, and finances.

## Features

- 📊 **Financial Dashboard** - Real-time overview of all production budgets and spending
- 📁 **Project Management** - Create and track multiple production budgets
- 💰 **Budget Builder** - Detailed line-item budgeting with OT calculations
- 📄 **Invoice Manager** - Track and approve vendor invoices with approval workflow
- 👥 **Contact Management** - Manage vendors and payees
- 📈 **Estimate vs Actuals** - Compare planned budgets against actual spending
- 🔗 **Shareable Links** - Share invoice upload links with team members

## Tech Stack

- **Framework:** Next.js 15 (App Router with Turbopack)
- **Language:** TypeScript
- **Database:** PostgreSQL (Supabase)
- **ORM:** Prisma
- **Styling:** Tailwind CSS
- **Icons:** Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (or Supabase account)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd bidline-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory:
   ```env
   # Database - Supabase Transaction Pooler (recommended for Next.js)
   DATABASE_URL="postgresql://user:password@host:6543/database?pgbouncer=true"

   # NextAuth (for future authentication)
   NEXTAUTH_SECRET="your-secret-key-here"
   NEXTAUTH_URL="http://localhost:3000"
   ```

   **Important for Supabase users:**
   - Use the **Transaction Pooler** connection string
   - Use port `6543` (not 5432)
   - Add `?pgbouncer=true` to disable prepared statements

4. **Set up the database**
   ```bash
   # Push schema to database
   npx prisma db push

   # Generate Prisma Client
   npx prisma generate
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open the app**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
bidline-app/
├── app/                      # Next.js pages and routes
│   ├── (dashboard)/         # Dashboard layout routes
│   │   ├── dashboard/      # Financial overview
│   │   ├── projects/       # Project management
│   │   ├── invoices/       # Invoice tracking
│   │   ├── contacts/       # Vendor management
│   │   └── settings/       # User settings
│   └── actions/            # Server actions (API layer)
│       ├── projects.ts     # Project operations
│       ├── invoices.ts     # Invoice operations
│       ├── contacts.ts     # Contact operations
│       └── dashboard.ts    # Dashboard stats
├── components/              # Reusable React components
│   ├── ui/                 # Generic UI components
│   └── sidebar.tsx         # Main navigation
├── lib/                     # Utilities and configuration
│   ├── constants.ts        # Application constants
│   ├── utils.ts            # Helper functions
│   └── prisma.ts           # Database client
├── types/                   # TypeScript type definitions
│   └── index.ts            # All shared types
├── prisma/                  # Database configuration
│   └── schema.prisma       # Database schema
└── public/                  # Static assets
```

## Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Comprehensive architecture guide
  - Data flow explanations
  - Database schema details
  - Server action patterns
  - Component architecture
  - Step-by-step guides for adding features

- **[CLAUDE.md](./CLAUDE.md)** - AI assistant development guide

## Development

### Available Commands

```bash
# Development
npm run dev          # Start dev server with Turbopack
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint

# Database
npx prisma studio    # Open database GUI
npx prisma db push   # Push schema changes
npx prisma generate  # Regenerate Prisma Client
```

### Development Workflow

1. **Start development server**
   ```bash
   npm run dev
   ```

2. **Open Prisma Studio** (in another terminal)
   ```bash
   npx prisma studio
   ```
   View and edit database records at http://localhost:5555

3. **Make code changes** - Changes auto-reload in browser

### Key Concepts

**Server Actions** - All database operations happen in `app/actions/` files. These run on the server but can be called from client components.

**Type Safety** - All types are defined in `types/index.ts`. No more `any` types!

**Constants** - Magic strings and values are in `lib/constants.ts` for easy maintenance.

**Utilities** - Helper functions for calculations and formatting are in `lib/utils.ts`.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed explanations.

## How It Works

### Budget Calculations

Budget line estimate formula:
```typescript
(days × rate) + (ot1.5 × rate × 1.5) + (ot2 × rate × 2) + (ot2.5 × rate × 2.5)
```

### Invoice Approval Flow

1. Upload invoice → Status: `WAITING_APPROVAL`
2. Approve invoice → Status changes to `APPROVED` or `PAID`
3. System automatically updates:
   - Project `totalSpent`
   - Budget line `actualSpent`
   - Calculates variance

### Variance Tracking

```
variance = estimate - actualSpent
```
- Positive variance = Under budget ✅
- Negative variance = Over budget ⚠️

## Troubleshooting

### "Can't reach database server"

**Cause:** Database paused or wrong connection string

**Fix:**
1. Check Supabase dashboard - resume if paused
2. Verify `.env` has correct `DATABASE_URL`
3. Ensure using Transaction Pooler (port 6543)

### "Prepared statement does not exist"

**Cause:** Missing `?pgbouncer=true` in connection string

**Fix:** Add `?pgbouncer=true` to end of `DATABASE_URL`

### Changes not showing

**Fix:**
1. Hard refresh (Cmd/Ctrl + Shift + R)
2. Restart dev server
3. Clear build cache: `rm -rf .next && npm run dev`

## Adding New Features

See [ARCHITECTURE.md#adding-new-features](./ARCHITECTURE.md#adding-new-features) for step-by-step guide.

Quick overview:
1. Update database schema (`prisma/schema.prisma`)
2. Add TypeScript types (`types/index.ts`)
3. Create server actions (`app/actions/`)
4. Build UI components
5. Update constants if needed

## Future Enhancements

- [ ] User authentication (NextAuth)
- [ ] File upload for invoices
- [ ] PDF export for budgets
- [ ] Bank account integration
- [ ] Email notifications
- [ ] Mobile responsive design
- [ ] Dark mode support

## License

Private - All rights reserved
