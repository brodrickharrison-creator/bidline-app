"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "./auth";

export type CreateInvoiceInput = {
  invoiceNumber?: string;
  amount: number;
  projectId: string;
  budgetLineId?: string;
  payeeId?: string;
  status?: "MISSING" | "WAITING_APPROVAL" | "APPROVED" | "FLAGGED" | "PAID";
  fileName?: string;
};

export async function createInvoice(data: CreateInvoiceInput) {
  try {
    const invoiceRaw = await prisma.invoice.create({
      data: {
        invoiceNumber: data.invoiceNumber,
        amount: data.amount,
        projectId: data.projectId,
        budgetLineId: data.budgetLineId,
        payeeId: data.payeeId,
        status: data.status || "WAITING_APPROVAL",
      },
      include: {
        project: true,
        payee: true,
        budgetLine: true,
      },
    });

    // Update project total spent if invoice is approved or paid
    if (data.status === "APPROVED" || data.status === "PAID") {
      await updateProjectSpent(data.projectId);
      if (data.budgetLineId) {
        await updateBudgetLineSpent(data.budgetLineId);
      }
    }

    revalidatePath("/invoices");
    revalidatePath("/dashboard");
    revalidatePath("/projects");
    revalidatePath(`/projects/${data.projectId}`);

    // Convert Decimal fields for client component compatibility
    const invoice = {
      id: invoiceRaw.id,
      invoiceNumber: invoiceRaw.invoiceNumber,
      amount: Number(invoiceRaw.amount),
      status: invoiceRaw.status,
      payeeId: invoiceRaw.payeeId,
      projectId: invoiceRaw.projectId,
      budgetLineId: invoiceRaw.budgetLineId,
      paidAt: invoiceRaw.paidAt,
      createdAt: invoiceRaw.createdAt,
      updatedAt: invoiceRaw.updatedAt,
      payee: invoiceRaw.payee ? {
        id: invoiceRaw.payee.id,
        name: invoiceRaw.payee.name,
        email: invoiceRaw.payee.email,
        phone: invoiceRaw.payee.phone,
      } : null,
      project: {
        id: invoiceRaw.project.id,
        name: invoiceRaw.project.name,
        clientName: invoiceRaw.project.clientName,
        status: invoiceRaw.project.status,
        totalBudget: Number(invoiceRaw.project.totalBudget),
        totalSpent: Number(invoiceRaw.project.totalSpent),
        createdAt: invoiceRaw.project.createdAt,
        updatedAt: invoiceRaw.project.updatedAt,
        userId: invoiceRaw.project.userId,
      },
      budgetLine: invoiceRaw.budgetLine ? {
        id: invoiceRaw.budgetLine.id,
        category: invoiceRaw.budgetLine.category,
        lineNumber: invoiceRaw.budgetLine.lineNumber,
        name: invoiceRaw.budgetLine.name,
        quantity: invoiceRaw.budgetLine.quantity ? Number(invoiceRaw.budgetLine.quantity) : null,
        days: invoiceRaw.budgetLine.days ? Number(invoiceRaw.budgetLine.days) : null,
        rate: invoiceRaw.budgetLine.rate ? Number(invoiceRaw.budgetLine.rate) : null,
        ot1_5: invoiceRaw.budgetLine.ot1_5 ? Number(invoiceRaw.budgetLine.ot1_5) : null,
        ot2: invoiceRaw.budgetLine.ot2 ? Number(invoiceRaw.budgetLine.ot2) : null,
        ot2_5: invoiceRaw.budgetLine.ot2_5 ? Number(invoiceRaw.budgetLine.ot2_5) : null,
        estimate: Number(invoiceRaw.budgetLine.estimate),
        actualSpent: Number(invoiceRaw.budgetLine.actualSpent),
        projectId: invoiceRaw.budgetLine.projectId,
        payeeId: invoiceRaw.budgetLine.payeeId,
        createdAt: invoiceRaw.budgetLine.createdAt,
        updatedAt: invoiceRaw.budgetLine.updatedAt,
      } : null,
    };

    return { success: true, invoice };
  } catch (error) {
    console.error("Failed to create invoice:", error);
    return { success: false, error: "Failed to create invoice" };
  }
}

export async function updateInvoiceStatus(
  invoiceId: string,
  status: "MISSING" | "WAITING_APPROVAL" | "APPROVED" | "FLAGGED" | "PAID"
) {
  try {
    const invoiceRaw = await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status },
      include: {
        project: true,
        budgetLine: true,
        payee: true,
      },
    });

    // Update spent amounts when status changes to/from approved/paid
    if (status === "APPROVED" || status === "PAID") {
      await updateProjectSpent(invoiceRaw.projectId);
      if (invoiceRaw.budgetLineId) {
        await updateBudgetLineSpent(invoiceRaw.budgetLineId);
      }
    }

    revalidatePath("/invoices");
    revalidatePath("/dashboard");
    revalidatePath("/projects");
    revalidatePath(`/projects/${invoiceRaw.projectId}`);

    // Convert Decimal fields for client component compatibility
    const invoice = {
      id: invoiceRaw.id,
      invoiceNumber: invoiceRaw.invoiceNumber,
      amount: Number(invoiceRaw.amount),
      status: invoiceRaw.status,
      payeeId: invoiceRaw.payeeId,
      projectId: invoiceRaw.projectId,
      budgetLineId: invoiceRaw.budgetLineId,
      paidAt: invoiceRaw.paidAt,
      createdAt: invoiceRaw.createdAt,
      updatedAt: invoiceRaw.updatedAt,
      payee: invoiceRaw.payee ? {
        id: invoiceRaw.payee.id,
        name: invoiceRaw.payee.name,
        email: invoiceRaw.payee.email,
        phone: invoiceRaw.payee.phone,
      } : null,
      project: {
        id: invoiceRaw.project.id,
        name: invoiceRaw.project.name,
        clientName: invoiceRaw.project.clientName,
        status: invoiceRaw.project.status,
        totalBudget: Number(invoiceRaw.project.totalBudget),
        totalSpent: Number(invoiceRaw.project.totalSpent),
        createdAt: invoiceRaw.project.createdAt,
        updatedAt: invoiceRaw.project.updatedAt,
        userId: invoiceRaw.project.userId,
      },
      budgetLine: invoiceRaw.budgetLine ? {
        id: invoiceRaw.budgetLine.id,
        category: invoiceRaw.budgetLine.category,
        lineNumber: invoiceRaw.budgetLine.lineNumber,
        name: invoiceRaw.budgetLine.name,
        quantity: invoiceRaw.budgetLine.quantity ? Number(invoiceRaw.budgetLine.quantity) : null,
        days: invoiceRaw.budgetLine.days ? Number(invoiceRaw.budgetLine.days) : null,
        rate: invoiceRaw.budgetLine.rate ? Number(invoiceRaw.budgetLine.rate) : null,
        ot1_5: invoiceRaw.budgetLine.ot1_5 ? Number(invoiceRaw.budgetLine.ot1_5) : null,
        ot2: invoiceRaw.budgetLine.ot2 ? Number(invoiceRaw.budgetLine.ot2) : null,
        ot2_5: invoiceRaw.budgetLine.ot2_5 ? Number(invoiceRaw.budgetLine.ot2_5) : null,
        estimate: Number(invoiceRaw.budgetLine.estimate),
        actualSpent: Number(invoiceRaw.budgetLine.actualSpent),
        projectId: invoiceRaw.budgetLine.projectId,
        payeeId: invoiceRaw.budgetLine.payeeId,
        createdAt: invoiceRaw.budgetLine.createdAt,
        updatedAt: invoiceRaw.budgetLine.updatedAt,
      } : null,
    };

    return { success: true, invoice };
  } catch (error) {
    console.error("Failed to update invoice status:", error);
    return { success: false, error: "Failed to update invoice status" };
  }
}

async function updateProjectSpent(projectId: string) {
  const invoices = await prisma.invoice.findMany({
    where: {
      projectId,
      status: {
        in: ["APPROVED", "PAID"],
      },
    },
  });

  const totalSpent = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);

  await prisma.project.update({
    where: { id: projectId },
    data: { totalSpent },
  });
}

async function updateBudgetLineSpent(budgetLineId: string) {
  const invoices = await prisma.invoice.findMany({
    where: {
      budgetLineId,
      status: {
        in: ["APPROVED", "PAID"],
      },
    },
  });

  const actualSpent = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);

  await prisma.budgetLine.update({
    where: { id: budgetLineId },
    data: { actualSpent },
  });
}

export async function getInvoices(filters?: {
  projectId?: string;
  status?: string;
}) {
  try {
    // Get authenticated user
    const user = await getCurrentUser();

    if (!user) {
      return [];
    }

    const where: any = {
      project: {
        userId: user.id,
      },
    };

    if (filters?.projectId) {
      where.projectId = filters.projectId;
    }

    // Only add status filter if it's not "All"
    if (filters?.status && filters.status !== "All") {
      where.status = filters.status.toUpperCase().replace(" ", "_");
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        project: true,
        payee: true,
        budgetLine: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Convert Decimal to number for client component compatibility
    return invoices.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amount: Number(invoice.amount),
      status: invoice.status,
      payeeId: invoice.payeeId,
      projectId: invoice.projectId,
      budgetLineId: invoice.budgetLineId,
      paidAt: invoice.paidAt,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
      payee: invoice.payee ? {
        id: invoice.payee.id,
        name: invoice.payee.name,
        email: invoice.payee.email,
        phone: invoice.payee.phone,
      } : null,
      project: {
        id: invoice.project.id,
        name: invoice.project.name,
        clientName: invoice.project.clientName,
        status: invoice.project.status,
        totalBudget: Number(invoice.project.totalBudget),
        totalSpent: Number(invoice.project.totalSpent),
        createdAt: invoice.project.createdAt,
        updatedAt: invoice.project.updatedAt,
        userId: invoice.project.userId,
      },
      budgetLine: invoice.budgetLine
        ? {
            id: invoice.budgetLine.id,
            category: invoice.budgetLine.category,
            lineNumber: invoice.budgetLine.lineNumber,
            name: invoice.budgetLine.name,
            quantity: invoice.budgetLine.quantity ? Number(invoice.budgetLine.quantity) : null,
            days: invoice.budgetLine.days ? Number(invoice.budgetLine.days) : null,
            rate: invoice.budgetLine.rate ? Number(invoice.budgetLine.rate) : null,
            ot1_5: invoice.budgetLine.ot1_5 ? Number(invoice.budgetLine.ot1_5) : null,
            ot2: invoice.budgetLine.ot2 ? Number(invoice.budgetLine.ot2) : null,
            ot2_5: invoice.budgetLine.ot2_5 ? Number(invoice.budgetLine.ot2_5) : null,
            estimate: Number(invoice.budgetLine.estimate),
            actualSpent: Number(invoice.budgetLine.actualSpent),
            projectId: invoice.budgetLine.projectId,
            payeeId: invoice.budgetLine.payeeId,
            createdAt: invoice.budgetLine.createdAt,
            updatedAt: invoice.budgetLine.updatedAt,
          }
        : null,
    }));
  } catch (error) {
    console.error("Failed to fetch invoices:", error);
    return [];
  }
}

export async function getInvoiceById(invoiceId: string) {
  try {
    // Get authenticated user
    const user = await getCurrentUser();

    if (!user) {
      return null;
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        payee: true,
        project: true,
        budgetLine: true,
      },
    });

    if (!invoice) {
      return null;
    }

    // Verify the invoice belongs to the user's project
    if (invoice.project && invoice.project.userId !== user.id) {
      return null;
    }

    // Convert Decimal fields for client component compatibility
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amount: Number(invoice.amount),
      status: invoice.status,
      payeeId: invoice.payeeId,
      projectId: invoice.projectId,
      budgetLineId: invoice.budgetLineId,
      paidAt: invoice.paidAt,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
      payee: invoice.payee ? {
        id: invoice.payee.id,
        name: invoice.payee.name,
        email: invoice.payee.email,
        phone: invoice.payee.phone,
      } : null,
      project: {
        id: invoice.project.id,
        name: invoice.project.name,
        clientName: invoice.project.clientName,
        status: invoice.project.status,
        totalBudget: Number(invoice.project.totalBudget),
        totalSpent: Number(invoice.project.totalSpent),
        createdAt: invoice.project.createdAt,
        updatedAt: invoice.project.updatedAt,
        userId: invoice.project.userId,
      },
      budgetLine: invoice.budgetLine ? {
        id: invoice.budgetLine.id,
        category: invoice.budgetLine.category,
        lineNumber: invoice.budgetLine.lineNumber,
        name: invoice.budgetLine.name,
        quantity: invoice.budgetLine.quantity ? Number(invoice.budgetLine.quantity) : null,
        days: invoice.budgetLine.days ? Number(invoice.budgetLine.days) : null,
        rate: invoice.budgetLine.rate ? Number(invoice.budgetLine.rate) : null,
        ot1_5: invoice.budgetLine.ot1_5 ? Number(invoice.budgetLine.ot1_5) : null,
        ot2: invoice.budgetLine.ot2 ? Number(invoice.budgetLine.ot2) : null,
        ot2_5: invoice.budgetLine.ot2_5 ? Number(invoice.budgetLine.ot2_5) : null,
        estimate: Number(invoice.budgetLine.estimate),
        actualSpent: Number(invoice.budgetLine.actualSpent),
        projectId: invoice.budgetLine.projectId,
        payeeId: invoice.budgetLine.payeeId,
        createdAt: invoice.budgetLine.createdAt,
        updatedAt: invoice.budgetLine.updatedAt,
      } : null,
    };
  } catch (error) {
    console.error("Failed to fetch invoice:", error);
    return null;
  }
}

export async function deleteInvoice(invoiceId: string) {
  try {
    // Get authenticated user
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "Unauthorized - please log in" };
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        project: {
          select: { userId: true },
        },
      },
    });

    if (!invoice) {
      return { success: false, error: "Invoice not found" };
    }

    // Verify the invoice belongs to the user's project
    if (invoice.project && invoice.project.userId !== user.id) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.invoice.delete({
      where: { id: invoiceId },
    });

    // Recalculate spent amounts
    if (invoice.projectId) {
      await updateProjectSpent(invoice.projectId);
    }
    if (invoice.budgetLineId) {
      await updateBudgetLineSpent(invoice.budgetLineId);
    }

    revalidatePath("/invoices");
    revalidatePath("/dashboard");
    revalidatePath("/projects");
    if (invoice.projectId) {
      revalidatePath(`/projects/${invoice.projectId}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to delete invoice:", error);
    return { success: false, error: "Failed to delete invoice" };
  }
}

export async function getUnmatchedInvoices() {
  try {
    // Get authenticated user
    const user = await getCurrentUser();

    if (!user) {
      return [];
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        projectId: null, // Unassigned to any project
        payee: {
          userId: user.id, // Only show unmatched invoices from user's contacts
        },
      },
      include: {
        payee: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Convert Decimal fields for client component compatibility
    return invoices.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amount: Number(invoice.amount),
      status: invoice.status,
      payeeId: invoice.payeeId,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
      payee: invoice.payee ? {
        id: invoice.payee.id,
        name: invoice.payee.name,
        email: invoice.payee.email,
        phone: invoice.payee.phone,
      } : null,
    }));
  } catch (error) {
    console.error("Failed to fetch unmatched invoices:", error);
    return [];
  }
}

export async function getSuggestedLineItems(invoiceId: string) {
  try {
    // Get authenticated user
    const user = await getCurrentUser();

    if (!user) {
      return [];
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        payee: true,
      },
    });

    if (!invoice || !invoice.payee) {
      return [];
    }

    // Find all budget lines where this payee is assigned in user's projects
    const budgetLines = await prisma.budgetLine.findMany({
      where: {
        payeeId: invoice.payeeId,
        project: {
          userId: user.id,
        },
      },
      include: {
        project: true,
      },
      orderBy: {
        project: {
          createdAt: "desc",
        },
      },
    });

    // Convert Decimal fields
    return budgetLines.map((line) => ({
      id: line.id,
      category: line.category,
      lineNumber: line.lineNumber,
      name: line.name,
      estimate: Number(line.estimate),
      actualSpent: Number(line.actualSpent),
      projectId: line.projectId,
      project: {
        id: line.project.id,
        name: line.project.name,
        clientName: line.project.clientName,
        status: line.project.status,
      },
    }));
  } catch (error) {
    console.error("Failed to get suggested line items:", error);
    return [];
  }
}

export async function assignInvoiceToLineItem(
  invoiceId: string,
  projectId: string,
  budgetLineId: string | null
) {
  try {
    const invoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        projectId,
        budgetLineId,
      },
      include: {
        payee: true,
        project: true,
        budgetLine: true,
      },
    });

    // Update spent amounts
    await updateProjectSpent(projectId);
    if (budgetLineId) {
      await updateBudgetLineSpent(budgetLineId);
    }

    revalidatePath("/invoices");
    revalidatePath("/dashboard");
    revalidatePath("/projects");
    revalidatePath(`/projects/${projectId}`);

    // Convert Decimal fields
    const convertedInvoice = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amount: Number(invoice.amount),
      status: invoice.status,
      payeeId: invoice.payeeId,
      projectId: invoice.projectId,
      budgetLineId: invoice.budgetLineId,
      paidAt: invoice.paidAt,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
      payee: invoice.payee ? {
        id: invoice.payee.id,
        name: invoice.payee.name,
        email: invoice.payee.email,
        phone: invoice.payee.phone,
      } : null,
      project: invoice.project ? {
        id: invoice.project.id,
        name: invoice.project.name,
        clientName: invoice.project.clientName,
        status: invoice.project.status,
        totalBudget: Number(invoice.project.totalBudget),
        totalSpent: Number(invoice.project.totalSpent),
        createdAt: invoice.project.createdAt,
        updatedAt: invoice.project.updatedAt,
        userId: invoice.project.userId,
      } : null,
      budgetLine: invoice.budgetLine ? {
        id: invoice.budgetLine.id,
        category: invoice.budgetLine.category,
        lineNumber: invoice.budgetLine.lineNumber,
        name: invoice.budgetLine.name,
        quantity: invoice.budgetLine.quantity ? Number(invoice.budgetLine.quantity) : null,
        days: invoice.budgetLine.days ? Number(invoice.budgetLine.days) : null,
        rate: invoice.budgetLine.rate ? Number(invoice.budgetLine.rate) : null,
        ot1_5: invoice.budgetLine.ot1_5 ? Number(invoice.budgetLine.ot1_5) : null,
        ot2: invoice.budgetLine.ot2 ? Number(invoice.budgetLine.ot2) : null,
        ot2_5: invoice.budgetLine.ot2_5 ? Number(invoice.budgetLine.ot2_5) : null,
        estimate: Number(invoice.budgetLine.estimate),
        actualSpent: Number(invoice.budgetLine.actualSpent),
        projectId: invoice.budgetLine.projectId,
        payeeId: invoice.budgetLine.payeeId,
        createdAt: invoice.budgetLine.createdAt,
        updatedAt: invoice.budgetLine.updatedAt,
      } : null,
    };

    return { success: true, invoice: convertedInvoice };
  } catch (error) {
    console.error("Failed to assign invoice to line item:", error);
    return { success: false, error: "Failed to assign invoice" };
  }
}
