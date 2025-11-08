-- Manual migration to add LineItemTemplate table and update BudgetLine category
-- Run this in Supabase SQL Editor if prisma db push is not working

-- Step 1: Create LineItemTemplate table
CREATE TABLE IF NOT EXISTS "LineItemTemplate" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LineItemTemplate_pkey" PRIMARY KEY ("id")
);

-- Step 2: Create indexes on LineItemTemplate
CREATE INDEX IF NOT EXISTS "LineItemTemplate_category_idx" ON "LineItemTemplate"("category");
CREATE INDEX IF NOT EXISTS "LineItemTemplate_isDefault_idx" ON "LineItemTemplate"("isDefault");

-- Step 3: Drop the BudgetCategory enum constraint if it exists and convert category to TEXT
-- First, alter the BudgetLine table to change category from enum to TEXT
ALTER TABLE "BudgetLine" ALTER COLUMN "category" TYPE TEXT;

-- Step 4: Drop the enum type if it exists (only after all references are removed)
DROP TYPE IF EXISTS "BudgetCategory";

-- Done! Now you can run: npx prisma generate && npm run db:seed
