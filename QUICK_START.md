# Quick Start Guide for Developers

Welcome to BidLine! This guide will get you up and running quickly.

## 🚀 First Time Setup (5 minutes)

1. **Clone and install:**
   ```bash
   git clone <repo-url>
   cd bidline-app
   npm install
   ```

2. **Set up database:**
   - Go to [Supabase](https://supabase.com) and create a free account
   - Create a new project
   - Go to Settings → Database → Connection string
   - Select "Transaction pooler" mode
   - Copy the connection string

3. **Configure environment:**
   ```bash
   # Create .env file
   echo 'DATABASE_URL="your-connection-string?pgbouncer=true"' > .env
   ```

4. **Initialize database:**
   ```bash
   npx prisma db push
   npx prisma generate
   ```

5. **Start developing:**
   ```bash
   npm run dev
   ```

   Open http://localhost:3000

## 📚 Essential Files to Know

| File | Purpose |
|------|---------|
| `types/index.ts` | All TypeScript types |
| `lib/constants.ts` | Magic values and configs |
| `lib/utils.ts` | Helper functions |
| `app/actions/` | Server-side API |
| `prisma/schema.prisma` | Database schema |

## 🔧 Common Tasks

### Add a New Page

1. Create file: `app/(dashboard)/your-page/page.tsx`
2. Add to sidebar: `components/sidebar.tsx`
3. Add route constant: `lib/constants.ts`

### Create a Server Action

```typescript
// app/actions/your-action.ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function yourAction(data: YourType) {
  try {
    const result = await prisma.model.create({ data });
    revalidatePath("/relevant-page");
    return { success: true, data: result };
  } catch (error) {
    console.error("Action failed:", error);
    return { success: false, error: "Message" };
  }
}
```

### Add a Database Field

1. Edit `prisma/schema.prisma`:
   ```prisma
   model Project {
     id   String @id
     name String
     newField String  // Add this
   }
   ```

2. Push to database:
   ```bash
   npx prisma db push
   ```

3. Update types in `types/index.ts`

### Create a Component

```typescript
// components/ui/YourComponent.tsx
interface YourComponentProps {
  title: string;
  value: number;
}

export function YourComponent({ title, value }: YourComponentProps) {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <h3>{title}</h3>
      <p>{value}</p>
    </div>
  );
}
```

## 🐛 Debugging Tips

### Check Database
```bash
npx prisma studio
```
Opens GUI at http://localhost:5555

### View Logs
Server actions log to terminal where `npm run dev` is running

### Reset Database
```bash
npx prisma db push --force-reset
```
⚠️ **Warning:** Deletes all data!

### Clear Build Cache
```bash
rm -rf .next
npm run dev
```

## 📖 Need More Details?

- **Architecture guide:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Full README:** [README.md](./README.md)
- **Database schema:** Look at `prisma/schema.prisma`
- **Type definitions:** Look at `types/index.ts`

## 💡 Pro Tips

1. **Use constants:** Never hard-code strings. Add them to `lib/constants.ts`
2. **Use utilities:** Formatting currency? Use `formatCurrency()` from `lib/utils.ts`
3. **Use types:** Import types from `@/types` instead of using `any`
4. **Follow patterns:** Look at existing code for examples
5. **Test with Prisma Studio:** View your data changes in real-time

## 🔄 Daily Workflow

```bash
# Morning
npm run dev              # Terminal 1
npx prisma studio        # Terminal 2

# During development
# - Edit code
# - Save (auto-reloads)
# - Check Prisma Studio for data
# - Check terminal for errors

# Before committing
npm run build            # Test production build
npm run lint             # Check for issues
```

## ❓ Quick Answers

**Q: Where do I add a new database table?**
A: `prisma/schema.prisma` → `npx prisma db push`

**Q: Where do I add API endpoints?**
A: Create server actions in `app/actions/`

**Q: Where do I add types?**
A: `types/index.ts`

**Q: Where do I add reusable components?**
A: `components/ui/`

**Q: Where do I add page routes?**
A: `app/(dashboard)/your-route/page.tsx`

**Q: Database not connecting?**
A: Check Supabase isn't paused, verify `.env` has `?pgbouncer=true`

**Q: Changes not showing?**
A: Hard refresh (Cmd/Ctrl + Shift + R) or restart dev server

## 🎯 Code Style

```typescript
// ✅ Good
import { formatCurrency } from "@/lib/utils";
import { Project } from "@/types";

export function ProjectCard({ project }: { project: Project }) {
  return <div>{formatCurrency(project.totalBudget)}</div>;
}

// ❌ Avoid
export function ProjectCard({ project }: { project: any }) {
  return <div>${project.totalBudget.toFixed(2)}</div>;
}
```

---

**That's it!** You're ready to build. When in doubt, look at existing code for patterns.
