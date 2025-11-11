"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
};

export async function createProject(formData: {
  name: string;
  projectCode: string;
  clientName: string;
  budgetLines: BudgetLineInput[];
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

    // Create project with budget lines
    const project = await prisma.project.create({
      data: {
        name: formData.name,
        projectCode: formData.projectCode.trim(),
        clientName: formData.clientName,
        totalBudget,
        status: "PLANNING",
        userId: user.id,
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
      },
    });

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
      totalBudget: Number(project.totalBudget),
      totalSpent: Number(project.totalSpent),
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
        createdAt: line.createdAt,
        updatedAt: line.updatedAt,
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
  }
) {
  try {
    // Calculate new estimate based on updated fields
    const currentLine = await prisma.budgetLine.findUnique({
      where: { id: budgetLineId },
    });

    if (!currentLine) {
      return { success: false, error: "Budget line not found" };
    }

    // Merge current values with updates
    const quantity = fields.quantity !== undefined ? fields.quantity : Number(currentLine.quantity) || 1;
    const days = fields.days !== undefined ? fields.days : Number(currentLine.days) || 0;
    const rate = fields.rate !== undefined ? fields.rate : Number(currentLine.rate) || 0;
    const ot1_5 = fields.ot1_5 !== undefined ? fields.ot1_5 : Number(currentLine.ot1_5) || 0;
    const ot2 = fields.ot2 !== undefined ? fields.ot2 : Number(currentLine.ot2) || 0;
    const ot2_5 = fields.ot2_5 !== undefined ? fields.ot2_5 : Number(currentLine.ot2_5) || 0;

    // Calculate new estimate
    const estimate = (quantity * days * rate) + (ot1_5 * rate * 1.5) + (ot2 * rate * 2) + (ot2_5 * rate * 2.5);

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
