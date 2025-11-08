import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function migrate() {
  console.log("Starting migration...");

  try {
    // Step 1: Create LineItemTemplate table
    console.log("Creating LineItemTemplate table...");
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "LineItemTemplate" (
        "id" TEXT NOT NULL,
        "category" TEXT NOT NULL,
        "role" TEXT NOT NULL,
        "isDefault" BOOLEAN NOT NULL DEFAULT true,
        "sortOrder" INTEGER NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "LineItemTemplate_pkey" PRIMARY KEY ("id")
      )
    `);

    // Step 2: Create indexes
    console.log("Creating indexes...");
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "LineItemTemplate_category_idx" ON "LineItemTemplate"("category")
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "LineItemTemplate_isDefault_idx" ON "LineItemTemplate"("isDefault")
    `);

    // Step 3: Convert BudgetLine.category to TEXT
    console.log("Converting BudgetLine.category to TEXT...");
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "BudgetLine" ALTER COLUMN "category" TYPE TEXT
    `);

    // Step 4: Drop the enum type if it exists
    console.log("Dropping BudgetCategory enum...");
    await prisma.$executeRawUnsafe(`
      DROP TYPE IF EXISTS "BudgetCategory"
    `);

    console.log("✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:");
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
