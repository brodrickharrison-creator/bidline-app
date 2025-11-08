"use server";

import { prisma } from "@/lib/prisma";

export async function getDefaultLineItemTemplates() {
  try {
    const templates = await prisma.lineItemTemplate.findMany({
      where: {
        isDefault: true,
      },
      orderBy: [
        { category: "asc" },
        { sortOrder: "asc" },
      ],
    });

    return templates;
  } catch (error) {
    console.error("Failed to fetch line item templates:", error);
    return [];
  }
}

export async function getTemplatesByCategory(category: string) {
  try {
    const templates = await prisma.lineItemTemplate.findMany({
      where: {
        category,
        isDefault: true,
      },
      orderBy: {
        sortOrder: "asc",
      },
    });

    return templates;
  } catch (error) {
    console.error(`Failed to fetch templates for category ${category}:`, error);
    return [];
  }
}

export async function getAllTemplateCategories() {
  try {
    const categories = await prisma.lineItemTemplate.findMany({
      where: {
        isDefault: true,
      },
      select: {
        category: true,
      },
      distinct: ["category"],
      orderBy: {
        category: "asc",
      },
    });

    return categories.map((c) => c.category);
  } catch (error) {
    console.error("Failed to fetch template categories:", error);
    return [];
  }
}
