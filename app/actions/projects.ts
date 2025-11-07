"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type BudgetLineInput = {
  category: "PRE_PRODUCTION" | "PRODUCTION" | "POST_PRODUCTION";
  lineNumber: number;
  name: string;
  quantity?: number;
  days?: number;
  rate?: number;
  ot1_5?: number;
  ot2?: number;
  ot2_5?: number;
};

export async function createProject(formData: {
  name: string;
  clientName: string;
  budgetLines: BudgetLineInput[];
}) {
  try {
    // Calculate total budget from all line items
    const totalBudget = formData.budgetLines.reduce((sum, line) => {
      const days = line.days || 0;
      const rate = line.rate || 0;
      const ot1_5 = line.ot1_5 || 0;
      const ot2 = line.ot2 || 0;
      const ot2_5 = line.ot2_5 || 0;

      const estimate = (days * rate) + (ot1_5 * rate * 1.5) + (ot2 * rate * 2) + (ot2_5 * rate * 2.5);
      return sum + estimate;
    }, 0);

    // For now, we'll use a hardcoded user ID
    // TODO: Replace with actual user ID from authentication
    const userId = "temp-user-id";

    // Check if temp user exists, create if not
    let user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          email: "temp@example.com",
          name: "Temporary User",
        },
      });
    }

    // Create project with budget lines
    const project = await prisma.project.create({
      data: {
        name: formData.name,
        clientName: formData.clientName,
        totalBudget,
        status: "PLANNING",
        userId,
        budgetLines: {
          create: formData.budgetLines.map((line) => {
            const days = line.days || 0;
            const rate = line.rate || 0;
            const ot1_5 = line.ot1_5 || 0;
            const ot2 = line.ot2 || 0;
            const ot2_5 = line.ot2_5 || 0;

            const estimate = (days * rate) + (ot1_5 * rate * 1.5) + (ot2 * rate * 2) + (ot2_5 * rate * 2.5);

            return {
              category: line.category,
              lineNumber: line.lineNumber,
              name: line.name,
              quantity: line.quantity,
              days,
              rate,
              ot1_5,
              ot2,
              ot2_5,
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
    const projects = await prisma.project.findMany({
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
