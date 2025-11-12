/**
 * Cleanup Orphaned Data Script
 *
 * Removes projects created before proper user authentication was implemented,
 * along with their associated budget lines and invoices.
 *
 * Run with: npx tsx scripts/cleanup-orphaned-data.ts
 */

import { prisma } from "../lib/prisma";

async function main() {
  console.log("🔍 Starting orphaned data cleanup...\n");

  // Step 1: Find orphaned projects
  console.log("Step 1: Inspecting orphaned projects...");

  const allProjects = await prisma.project.findMany({
    select: {
      id: true,
      name: true,
      userId: true,
      createdAt: true,
      status: true,
      _count: {
        select: {
          budgetLines: true,
          invoices: true,
        },
      },
    },
  });

  const allUsers = await prisma.user.findMany({
    select: { id: true },
  });

  const userIds = new Set(allUsers.map(u => u.id));

  const orphanedProjects = allProjects.filter(
    p => !p.userId || !userIds.has(p.userId)
  );

  console.log(`Found ${orphanedProjects.length} orphaned projects:\n`);

  if (orphanedProjects.length > 0) {
    orphanedProjects.forEach(p => {
      console.log(`  - ${p.name} (ID: ${p.id})`);
      console.log(`    User ID: ${p.userId || "NULL"}`);
      console.log(`    Created: ${p.createdAt.toISOString()}`);
      console.log(`    Budget Lines: ${p._count.budgetLines}`);
      console.log(`    Invoices: ${p._count.invoices}\n`);
    });

    // Step 2: Delete orphaned projects
    console.log("Step 2: Deleting orphaned projects...");

    const deleteResult = await prisma.project.deleteMany({
      where: {
        OR: [
          { userId: null },
          { userId: { notIn: Array.from(userIds) } },
        ],
      },
    });

    console.log(`✅ Deleted ${deleteResult.count} orphaned projects (CASCADE deleted budget lines and invoices)\n`);
  } else {
    console.log("✅ No orphaned projects found!\n");
  }

  // Step 3: Check for orphaned budget lines (shouldn't exist due to CASCADE, but let's verify)
  console.log("Step 3: Checking for orphaned budget lines...");

  const allBudgetLines = await prisma.budgetLine.findMany({
    select: { id: true, projectId: true },
  });

  const allProjectIds = await prisma.project.findMany({
    select: { id: true },
  });

  const projectIds = new Set(allProjectIds.map(p => p.id));

  const orphanedBudgetLines = allBudgetLines.filter(
    bl => !projectIds.has(bl.projectId)
  );

  if (orphanedBudgetLines.length > 0) {
    console.log(`Found ${orphanedBudgetLines.length} orphaned budget lines. Cleaning up...`);

    const deleteBudgetLinesResult = await prisma.budgetLine.deleteMany({
      where: {
        projectId: { notIn: Array.from(projectIds) },
      },
    });

    console.log(`✅ Deleted ${deleteBudgetLinesResult.count} orphaned budget lines\n`);
  } else {
    console.log("✅ No orphaned budget lines found!\n");
  }

  // Step 4: Check for orphaned invoices (excluding NULL projectId which is valid)
  console.log("Step 4: Checking for orphaned invoices...");

  const allInvoices = await prisma.invoice.findMany({
    where: {
      projectId: { not: null },
    },
    select: { id: true, projectId: true },
  });

  const orphanedInvoices = allInvoices.filter(
    inv => inv.projectId && !projectIds.has(inv.projectId)
  );

  if (orphanedInvoices.length > 0) {
    console.log(`Found ${orphanedInvoices.length} orphaned invoices. Cleaning up...`);

    const deleteInvoicesResult = await prisma.invoice.deleteMany({
      where: {
        AND: [
          { projectId: { not: null } },
          { projectId: { notIn: Array.from(projectIds) } },
        ],
      },
    });

    console.log(`✅ Deleted ${deleteInvoicesResult.count} orphaned invoices\n`);
  } else {
    console.log("✅ No orphaned invoices found!\n");
  }

  // Step 5: Final verification
  console.log("Step 5: Final verification...");

  const finalProjectCount = await prisma.project.count({
    where: {
      OR: [
        { userId: null },
        { userId: { notIn: Array.from(userIds) } },
      ],
    },
  });

  console.log(`Orphaned projects remaining: ${finalProjectCount}`);

  if (finalProjectCount === 0) {
    console.log("✅ Database cleanup completed successfully!");
  } else {
    console.log("⚠️  Warning: Some orphaned projects still remain. Please investigate.");
  }
}

main()
  .catch((error) => {
    console.error("❌ Error during cleanup:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
