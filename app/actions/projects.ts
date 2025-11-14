"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { calculateEstimateWithRuleset } from "@/lib/utils";

export type BudgetLineInput = {
  category: string;
  lineNumber: number;
  name: string;
  quantity?: number | null;
  days?: number | null;
  rate?: number | null;
  ot1_5?: number | null;
  ot2?: number | null;
  ot2_5?: number | null;
  fringeRuleId?: string | null;
};

export type FringeRuleInput = {
  id: string;
  name: string;
  percentage: number;
};

export async function createProject(formData: {
  name: string;
  projectCode: string;
  clientName: string;
  budgetLines: BudgetLineInput[];
  fringeRules?: FringeRuleInput[];
  ruleset?: string | null;
  insurancePercent?: number;
  productionFeePercent?: number;
}) {
  try {
    // Get authenticated user
    const { getCurrentUser } = await import("./auth");
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "Unauthorized - please log in" };
    }

    // Validate project code
    if (!formData.projectCode || formData.projectCode.trim().length === 0) {
      return { success: false, error: "Project code is required" };
    }

    // Check if project code already exists for this user
    const existingProject = await prisma.project.findFirst({
      where: {
        userId: user.id,
        projectCode: formData.projectCode.trim(),
      },
    });

    if (existingProject) {
      return {
        success: false,
        error: "Project code already exists. Please choose a different code.",
      };
    }

    // Calculate total budget from all line items
    const totalBudget = formData.budgetLines.reduce((sum, line) => {
      const quantity = line.quantity ?? 1; // Default to 1 if null/undefined
      const days = line.days ?? 0;
      const rate = line.rate ?? 0;
      const ot1_5 = line.ot1_5 ?? 0;
      const ot2 = line.ot2 ?? 0;
      const ot2_5 = line.ot2_5 ?? 0;

      const estimate = (quantity * days * rate) + (ot1_5 * rate * 1.5) + (ot2 * rate * 2) + (ot2_5 * rate * 2.5);
      return sum + estimate;
    }, 0);

    // Create project with budget lines and fringe rules
    const project = await prisma.project.create({
      data: {
        name: formData.name,
        projectCode: formData.projectCode.trim(),
        clientName: formData.clientName,
        totalBudget,
        status: "PLANNING",
        ruleset: formData.ruleset || "FLAT_RATE",
        insurancePercent: formData.insurancePercent || 0,
        productionFeePercent: formData.productionFeePercent || 0,
        userId: user.id,
        fringeRules: formData.fringeRules && formData.fringeRules.length > 0 ? {
          create: formData.fringeRules.map((rule) => ({
            name: rule.name,
            percentage: rule.percentage,
          })),
        } : undefined,
        budgetLines: {
          create: formData.budgetLines.map((line) => {
            // Use nullish coalescing for calculation only
            const quantity = line.quantity ?? 1;
            const days = line.days ?? 0;
            const rate = line.rate ?? 0;
            const ot1_5 = line.ot1_5 ?? 0;
            const ot2 = line.ot2 ?? 0;
            const ot2_5 = line.ot2_5 ?? 0;

            const estimate = (quantity * days * rate) + (ot1_5 * rate * 1.5) + (ot2 * rate * 2) + (ot2_5 * rate * 2.5);

            return {
              category: line.category,
              lineNumber: line.lineNumber,
              name: line.name,
              // Store actual values (including null) in database
              quantity: line.quantity,
              days: line.days,
              rate: line.rate,
              ot1_5: line.ot1_5,
              ot2: line.ot2,
              ot2_5: line.ot2_5,
              estimate,
            };
          }),
        },
      },
      include: {
        budgetLines: true,
        fringeRules: true,
      },
    });

    // Map frontend fringe rule IDs to database IDs and update budget lines
    if (formData.fringeRules && formData.fringeRules.length > 0) {
      const fringeIdMap = new Map<string, string>();
      formData.fringeRules.forEach((inputRule, index) => {
        fringeIdMap.set(inputRule.id, project.fringeRules[index].id);
      });

      // Update budget lines with correct fringe rule IDs
      const linesToUpdate = formData.budgetLines
        .map((line, index) => ({
          dbLine: project.budgetLines[index],
          fringeRuleId: line.fringeRuleId ? fringeIdMap.get(line.fringeRuleId) : null,
        }))
        .filter((item) => item.fringeRuleId !== null && item.fringeRuleId !== undefined);

      for (const { dbLine, fringeRuleId } of linesToUpdate) {
        await prisma.budgetLine.update({
          where: { id: dbLine.id },
          data: { fringeRuleId },
        });
      }
    }

    // Revalidate pages that show project data
    revalidatePath("/projects");
    revalidatePath("/dashboard");

    return { success: true, projectId: project.id };
  } catch (error) {
    console.error("Failed to create project:", error);
    return { success: false, error: "Failed to create project" };
  }
}

export async function getProjects() {
  try {
    // Get authenticated user
    const { getCurrentUser } = await import("./auth");
    const user = await getCurrentUser();

    if (!user) {
      return [];
    }

    const projects = await prisma.project.findMany({
      where: {
        userId: user.id,
      },
      include: {
        budgetLines: true,
        _count: {
          select: {
            invoices: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Convert Decimal to number for client component compatibility
    return projects.map((project) => ({
      id: project.id,
      name: project.name,
      clientName: project.clientName,
      status: project.status,
      ruleset: project.ruleset,
      totalBudget: Number(project.totalBudget),
      totalSpent: Number(project.totalSpent),
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      userId: project.userId,
      _count: project._count,
      budgetLines: project.budgetLines.map((line) => ({
        id: line.id,
        category: line.category,
        lineNumber: line.lineNumber,
        name: line.name,
        quantity: line.quantity ? Number(line.quantity) : null,
        days: line.days ? Number(line.days) : null,
        rate: line.rate ? Number(line.rate) : null,
        ot1_5: line.ot1_5 ? Number(line.ot1_5) : null,
        ot2: line.ot2 ? Number(line.ot2) : null,
        ot2_5: line.ot2_5 ? Number(line.ot2_5) : null,
        estimate: Number(line.estimate),
        actualSpent: Number(line.actualSpent),
        projectId: line.projectId,
        payeeId: line.payeeId,
        createdAt: line.createdAt,
        updatedAt: line.updatedAt,
      })),
    }));
  } catch (error) {
    console.error("Failed to fetch projects:", error);
    return [];
  }
}

export async function getProjectById(id: string) {
  try {
    // Get authenticated user
    const { getCurrentUser } = await import("./auth");
    const user = await getCurrentUser();

    if (!user) {
      return null;
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        budgetLines: {
          include: {
            payee: true,
            fringeRule: true,
          },
          orderBy: {
            lineNumber: "asc",
          },
        },
        invoices: {
          include: {
            payee: true,
          },
        },
        fringeRules: {
          orderBy: {
            name: "asc",
          },
        },
      },
    });

    if (!project) return null;

    // Verify the project belongs to the user
    if (project.userId !== user.id) {
      return null;
    }

    // Convert Decimal to number for client component compatibility
    return {
      ...project,
      ruleset: project.ruleset,
      totalBudget: Number(project.totalBudget),
      totalSpent: Number(project.totalSpent),
      insurancePercent: project.insurancePercent ? Number(project.insurancePercent) : 0,
      productionFeePercent: project.productionFeePercent ? Number(project.productionFeePercent) : 0,
      budgetLines: project.budgetLines.map((line) => ({
        id: line.id,
        category: line.category,
        lineNumber: line.lineNumber,
        name: line.name,
        quantity: line.quantity ? Number(line.quantity) : null,
        days: line.days ? Number(line.days) : null,
        rate: line.rate ? Number(line.rate) : null,
        ot1_5: line.ot1_5 ? Number(line.ot1_5) : null,
        ot2: line.ot2 ? Number(line.ot2) : null,
        ot2_5: line.ot2_5 ? Number(line.ot2_5) : null,
        otHours: line.otHours ? Number(line.otHours) : null,
        midnightHours: line.midnightHours ? Number(line.midnightHours) : null,
        estimate: Number(line.estimate),
        runningAmount: line.runningAmount ? Number(line.runningAmount) : null,
        actualSpent: Number(line.actualSpent),
        projectId: line.projectId,
        payeeId: line.payeeId,
        payee: line.payee ? {
          id: line.payee.id,
          name: line.payee.name,
          email: line.payee.email,
          phone: line.payee.phone,
        } : null,
        fringeRuleId: line.fringeRuleId,
        fringeRule: line.fringeRule ? {
          id: line.fringeRule.id,
          name: line.fringeRule.name,
          percentage: Number(line.fringeRule.percentage),
          projectId: line.fringeRule.projectId,
        } : null,
        createdAt: line.createdAt,
        updatedAt: line.updatedAt,
      })),
      fringeRules: project.fringeRules.map((rule) => ({
        id: rule.id,
        name: rule.name,
        percentage: Number(rule.percentage),
        projectId: rule.projectId,
      })),
      invoices: project.invoices.map((invoice) => ({
        ...invoice,
        amount: Number(invoice.amount),
      })),
    };
  } catch (error) {
    console.error("Failed to fetch project:", error);
    return null;
  }
}

export async function assignBudgetLinePayee(budgetLineId: string, payeeId: string | null) {
  try {
    const budgetLineRaw = await prisma.budgetLine.update({
      where: { id: budgetLineId },
      data: { payeeId: payeeId },
      include: {
        payee: true,
        project: true,
      },
    });

    // Revalidate project pages
    revalidatePath("/projects");
    revalidatePath(`/projects/${budgetLineRaw.projectId}`);

    // Convert Decimal fields for client component compatibility
    const budgetLine = {
      id: budgetLineRaw.id,
      category: budgetLineRaw.category,
      lineNumber: budgetLineRaw.lineNumber,
      name: budgetLineRaw.name,
      quantity: budgetLineRaw.quantity ? Number(budgetLineRaw.quantity) : null,
      days: budgetLineRaw.days ? Number(budgetLineRaw.days) : null,
      rate: budgetLineRaw.rate ? Number(budgetLineRaw.rate) : null,
      ot1_5: budgetLineRaw.ot1_5 ? Number(budgetLineRaw.ot1_5) : null,
      ot2: budgetLineRaw.ot2 ? Number(budgetLineRaw.ot2) : null,
      ot2_5: budgetLineRaw.ot2_5 ? Number(budgetLineRaw.ot2_5) : null,
      estimate: Number(budgetLineRaw.estimate),
      actualSpent: Number(budgetLineRaw.actualSpent),
      projectId: budgetLineRaw.projectId,
      payeeId: budgetLineRaw.payeeId,
      createdAt: budgetLineRaw.createdAt,
      updatedAt: budgetLineRaw.updatedAt,
      payee: budgetLineRaw.payee ? {
        id: budgetLineRaw.payee.id,
        name: budgetLineRaw.payee.name,
        email: budgetLineRaw.payee.email,
        phone: budgetLineRaw.payee.phone,
      } : null,
      project: {
        id: budgetLineRaw.project.id,
        name: budgetLineRaw.project.name,
        clientName: budgetLineRaw.project.clientName,
        status: budgetLineRaw.project.status,
        totalBudget: Number(budgetLineRaw.project.totalBudget),
        totalSpent: Number(budgetLineRaw.project.totalSpent),
        createdAt: budgetLineRaw.project.createdAt,
        updatedAt: budgetLineRaw.project.updatedAt,
        userId: budgetLineRaw.project.userId,
      },
    };

    return { success: true, budgetLine };
  } catch (error) {
    console.error("Failed to assign payee to budget line:", error);
    return { success: false, error: "Failed to assign payee" };
  }
}

export async function updateRunningAmount(budgetLineId: string, runningAmount: number | null) {
  try {
    const budgetLineRaw = await prisma.budgetLine.update({
      where: { id: budgetLineId },
      data: { runningAmount: runningAmount },
      include: {
        project: true,
      },
    });

    // Revalidate project pages
    revalidatePath("/projects");
    revalidatePath(`/projects/${budgetLineRaw.projectId}`);

    return { success: true };
  } catch (error) {
    console.error("Failed to update running amount:", error);
    return { success: false, error: "Failed to update running amount" };
  }
}

export async function updateBudgetLineFields(
  budgetLineId: string,
  fields: {
    name?: string;
    quantity?: number;
    days?: number;
    rate?: number;
    ot1_5?: number;
    ot2?: number;
    ot2_5?: number;
    otHours?: number;
    midnightHours?: number;
  }
) {
  try {
    // Calculate new estimate based on updated fields
    const currentLine = await prisma.budgetLine.findUnique({
      where: { id: budgetLineId },
      include: {
        project: true,
        fringeRule: true,
      },
    });

    if (!currentLine) {
      return { success: false, error: "Budget line not found" };
    }

    // Merge current values with updates
    const mergedData = {
      quantity: fields.quantity !== undefined ? fields.quantity : Number(currentLine.quantity) || 0,
      days: fields.days !== undefined ? fields.days : Number(currentLine.days) || 0,
      rate: fields.rate !== undefined ? fields.rate : Number(currentLine.rate) || 0,
      ot1_5: fields.ot1_5 !== undefined ? fields.ot1_5 : Number(currentLine.ot1_5) || 0,
      ot2: fields.ot2 !== undefined ? fields.ot2 : Number(currentLine.ot2) || 0,
      ot2_5: fields.ot2_5 !== undefined ? fields.ot2_5 : Number(currentLine.ot2_5) || 0,
      otHours: fields.otHours !== undefined ? fields.otHours : Number(currentLine.otHours) || 0,
      midnightHours: fields.midnightHours !== undefined ? fields.midnightHours : Number(currentLine.midnightHours) || 0,
    };

    // Calculate base estimate using ruleset-aware function
    const baseEstimate = calculateEstimateWithRuleset(mergedData, currentLine.project.ruleset);

    // Apply fringe if assigned to this line
    let estimate = baseEstimate;
    if (currentLine.fringeRule) {
      const fringePercent = Number(currentLine.fringeRule.percentage);
      const fringeAmount = baseEstimate * (fringePercent / 100);
      estimate = baseEstimate + fringeAmount;
    }

    // Update the budget line
    const budgetLineRaw = await prisma.budgetLine.update({
      where: { id: budgetLineId },
      data: {
        name: fields.name !== undefined ? fields.name : currentLine.name,
        quantity: fields.quantity !== undefined ? fields.quantity : currentLine.quantity,
        days: fields.days !== undefined ? fields.days : currentLine.days,
        rate: fields.rate !== undefined ? fields.rate : currentLine.rate,
        ot1_5: fields.ot1_5 !== undefined ? fields.ot1_5 : currentLine.ot1_5,
        ot2: fields.ot2 !== undefined ? fields.ot2 : currentLine.ot2,
        ot2_5: fields.ot2_5 !== undefined ? fields.ot2_5 : currentLine.ot2_5,
        otHours: fields.otHours !== undefined ? fields.otHours : currentLine.otHours,
        midnightHours: fields.midnightHours !== undefined ? fields.midnightHours : currentLine.midnightHours,
        estimate,
      },
      include: {
        project: true,
      },
    });

    // Update project total budget
    const allLines = await prisma.budgetLine.findMany({
      where: { projectId: budgetLineRaw.projectId },
    });

    const totalBudget = allLines.reduce((sum, line) => sum + Number(line.estimate), 0);

    await prisma.project.update({
      where: { id: budgetLineRaw.projectId },
      data: { totalBudget },
    });

    // Revalidate project pages
    revalidatePath("/projects");
    revalidatePath(`/projects/${budgetLineRaw.projectId}`);

    return { success: true };
  } catch (error) {
    console.error("Failed to update budget line fields:", error);
    return { success: false, error: "Failed to update budget line fields" };
  }
}

export async function addBudgetLine(
  projectId: string,
  category: string
) {
  try {
    // Get the highest line number for this project
    const existingLines = await prisma.budgetLine.findMany({
      where: { projectId },
      orderBy: { lineNumber: "desc" },
      take: 1,
    });

    const nextLineNumber = existingLines.length > 0 ? existingLines[0].lineNumber + 1 : 1;

    // Create new budget line with default values
    await prisma.budgetLine.create({
      data: {
        projectId,
        category,
        lineNumber: nextLineNumber,
        name: "New Line Item",
        quantity: 0,
        days: 0,
        rate: 0,
        ot1_5: 0,
        ot2: 0,
        ot2_5: 0,
        estimate: 0,
        actualSpent: 0,
      },
    });

    // Revalidate project pages
    revalidatePath("/projects");
    revalidatePath(`/projects/${projectId}`);

    return { success: true };
  } catch (error) {
    console.error("Failed to add budget line:", error);
    return { success: false, error: "Failed to add budget line" };
  }
}

export async function deleteProject(projectId: string) {
  try {
    // Get authenticated user
    const { getCurrentUser } = await import("./auth");
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "Unauthorized - please log in" };
    }

    // Verify the project belongs to the user
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });

    if (!existingProject || existingProject.userId !== user.id) {
      return { success: false, error: "Project not found or unauthorized" };
    }

    // Delete the project (cascade will delete budget lines and invoices)
    await prisma.project.delete({
      where: { id: projectId },
    });

    // Revalidate projects page
    revalidatePath("/projects");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Failed to delete project:", error);
    return { success: false, error: "Failed to delete project" };
  }
}

export async function updateProjectStatus(
  projectId: string,
  status: "PLANNING" | "LIVE" | "COMPLETED" | "ARCHIVED"
) {
  try {
    await prisma.project.update({
      where: { id: projectId },
      data: { status },
    });

    // Revalidate projects page
    revalidatePath("/projects");
    revalidatePath("/dashboard");
    revalidatePath(`/projects/${projectId}`);

    return { success: true };
  } catch (error) {
    console.error("Failed to update project status:", error);
    return { success: false, error: "Failed to update project status" };
  }
}

export async function updateProjectPercentages(
  projectId: string,
  insurancePercent: number,
  productionFeePercent: number
) {
  try {
    // Get authenticated user
    const { getCurrentUser } = await import("./auth");
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify project belongs to user
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });

    if (!project || project.userId !== user.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Update percentages
    await prisma.project.update({
      where: { id: projectId },
      data: {
        insurancePercent,
        productionFeePercent,
      },
    });

    // Revalidate project page
    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/projects");

    return { success: true };
  } catch (error) {
    console.error("Failed to update project percentages:", error);
    return { success: false, error: "Failed to update percentages" };
  }
}

export async function deleteBudgetLine(budgetLineId: string) {
  try {
    // Get the budget line to find its project
    const budgetLine = await prisma.budgetLine.findUnique({
      where: { id: budgetLineId },
      select: { projectId: true },
    });

    if (!budgetLine) {
      return { success: false, error: "Budget line not found" };
    }

    // Delete the budget line
    await prisma.budgetLine.delete({
      where: { id: budgetLineId },
    });

    // Recalculate project total budget
    const allLines = await prisma.budgetLine.findMany({
      where: { projectId: budgetLine.projectId },
    });

    const totalBudget = allLines.reduce((sum, line) => sum + Number(line.estimate), 0);

    await prisma.project.update({
      where: { id: budgetLine.projectId },
      data: { totalBudget },
    });

    // Revalidate project pages
    revalidatePath("/projects");
    revalidatePath(`/projects/${budgetLine.projectId}`);

    return { success: true };
  } catch (error) {
    console.error("Failed to delete budget line:", error);
    return { success: false, error: "Failed to delete budget line" };
  }
}

export async function duplicateBudgetLine(budgetLineId: string) {
  try {
    // Get the existing budget line
    const existingLine = await prisma.budgetLine.findUnique({
      where: { id: budgetLineId },
    });

    if (!existingLine) {
      return { success: false, error: "Budget line not found" };
    }

    // Get the highest line number for this project
    const allLines = await prisma.budgetLine.findMany({
      where: { projectId: existingLine.projectId },
      orderBy: { lineNumber: "desc" },
      take: 1,
    });

    const nextLineNumber = allLines.length > 0 ? allLines[0].lineNumber + 1 : 1;

    // Create duplicate with incremented line number
    await prisma.budgetLine.create({
      data: {
        projectId: existingLine.projectId,
        category: existingLine.category,
        lineNumber: nextLineNumber,
        name: `${existingLine.name} (Copy)`,
        quantity: existingLine.quantity,
        days: existingLine.days,
        rate: existingLine.rate,
        ot1_5: existingLine.ot1_5,
        ot2: existingLine.ot2,
        ot2_5: existingLine.ot2_5,
        otHours: existingLine.otHours,
        midnightHours: existingLine.midnightHours,
        estimate: existingLine.estimate,
        actualSpent: 0, // Reset actual spent for duplicate
        runningAmount: null, // Reset running amount for duplicate
        payeeId: existingLine.payeeId, // Copy payee assignment
      },
    });

    // Recalculate project total budget
    const updatedLines = await prisma.budgetLine.findMany({
      where: { projectId: existingLine.projectId },
    });

    const totalBudget = updatedLines.reduce((sum, line) => sum + Number(line.estimate), 0);

    await prisma.project.update({
      where: { id: existingLine.projectId },
      data: { totalBudget },
    });

    // Revalidate project pages
    revalidatePath("/projects");
    revalidatePath(`/projects/${existingLine.projectId}`);

    return { success: true };
  } catch (error) {
    console.error("Failed to duplicate budget line:", error);
    return { success: false, error: "Failed to duplicate budget line" };
  }
}
