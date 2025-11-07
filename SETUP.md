# BidLine Setup Instructions

## Important: Fix NPM Cache Permissions First

Before installing dependencies, you need to fix npm cache permissions:

```bash
sudo chown -R $(id -u):$(id -g) ~/.npm
```

This will prompt for your password. After running this command, npm should work correctly.

## Installation Steps

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```

   Then edit `.env` and add your PostgreSQL database URL:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/bidline?schema=public"
   ```

3. **Set up the database**:
   ```bash
   npm run db:push
   npm run db:generate
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Open the app**:
   Visit [http://localhost:3000](http://localhost:3000)

## What's Included

The app skeleton includes:

- ✅ Complete Next.js 15 setup with TypeScript and Tailwind
- ✅ Prisma schema with all database models (User, Project, BudgetLine, Invoice, Contact)
- ✅ Sidebar navigation with 5 main sections
- ✅ All page routes with placeholder UI:
  - Dashboard (financial overview)
  - Projects (list and creation form)
  - Invoice Manager
  - Contacts
  - Settings
- ✅ Responsive design matching the screenshots
- ✅ Database schema ready to use

## Next Steps

After setup, you can:

1. **Customize the design** - All pages use Tailwind classes and can be easily styled
2. **Add functionality** - Connect forms to Prisma actions
3. **Implement authentication** - Add NextAuth for user login
4. **Connect to database** - Start saving real data
5. **Add invoice upload** - Implement file upload functionality
6. **Build calculations** - Add budget calculation logic

## Troubleshooting

**If npm install fails**:
- Make sure you ran the permission fix command above
- Try clearing npm cache: `npm cache clean --force`
- Delete `node_modules` and try again

**If the database connection fails**:
- Make sure PostgreSQL is running
- Verify your DATABASE_URL in `.env`
- Check that the database exists

**If TypeScript errors appear**:
- Run `npm run db:generate` to generate Prisma types
- Restart your editor/IDE

## Development Tips

- Use `npm run db:studio` to view/edit database data visually
- Check the CLAUDE.md file for detailed architecture info
- All pages are in `app/(dashboard)/` directory
- Shared components go in `components/` directory
