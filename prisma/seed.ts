import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed process...");

  // Read the CSV file
  const csvPath = path.join(process.cwd(), "prisma/line_item_templates_seed.csv");

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found at: ${csvPath}`);
  }

  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const lines = csvContent.split("\n").filter(line => line.trim());

  // Skip header row
  const dataLines = lines.slice(1);

  console.log(`Found ${dataLines.length} templates to import`);

  // Clear existing templates
  await prisma.lineItemTemplate.deleteMany({});
  console.log("Cleared existing templates");

  // Parse and insert templates
  let imported = 0;
  for (const line of dataLines) {
    // Handle CSV parsing with quoted fields
    const match = line.match(/^"?([^",]+)"?,\s*"?([^",]+)"?,\s*"?(True|False)"?,\s*(\d+)/i);

    if (match) {
      const [, category, role, isDefaultStr, sortOrderStr] = match;

      await prisma.lineItemTemplate.create({
        data: {
          category: category.trim(),
          role: role.trim(),
          isDefault: isDefaultStr.trim().toLowerCase() === "true",
          sortOrder: parseInt(sortOrderStr.trim(), 10),
        },
      });

      imported++;
      if (imported % 50 === 0) {
        console.log(`Imported ${imported} templates...`);
      }
    }
  }

  console.log(`✅ Successfully imported ${imported} line item templates`);

  // Show summary by category
  const categories = await prisma.lineItemTemplate.groupBy({
    by: ["category"],
    _count: true,
  });

  console.log("\nTemplates by category:");
  categories.forEach((cat) => {
    console.log(`  ${cat.category}: ${cat._count} items`);
  });
}

main()
  .catch((e) => {
    console.error("Error seeding database:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
