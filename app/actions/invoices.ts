"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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
    const invoice = await prisma.invoice.create({
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
    const invoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status },
      include: {
        project: true,
        budgetLine: true,
      },
    });

    // Update spent amounts when status changes to/from approved/paid
    if (status === "APPROVED" || status === "PAID") {
      await updateProjectSpent(invoice.projectId);
      if (invoice.budgetLineId) {
        await updateBudgetLineSpent(invoice.budgetLineId);
      }
    }

    revalidatePath("/invoices");
    revalidatePath("/dashboard");
    revalidatePath("/projects");
    revalidatePath(`/projects/${invoice.projectId}`);

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
    const where: any = {};

    if (filters?.projectId) {
      where.projectId = filters.projectId;
    }

    if (filters?.status && filters.status !== "All Status") {
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
      ...invoice,
      amount: Number(invoice.amount),
      project: {
        ...invoice.project,
        totalBudget: Number(invoice.project.totalBudget),
        totalSpent: Number(invoice.project.totalSpent),
      },
      budgetLine: invoice.budgetLine
        ? {
            ...invoice.budgetLine,
            quantity: invoice.budgetLine.quantity ? Number(invoice.budgetLine.quantity) : null,
            days: invoice.budgetLine.days ? Number(invoice.budgetLine.days) : null,
            rate: invoice.budgetLine.rate ? Number(invoice.budgetLine.rate) : null,
            ot1_5: invoice.budgetLine.ot1_5 ? Number(invoice.budgetLine.ot1_5) : null,
            ot2: invoice.budgetLine.ot2 ? Number(invoice.budgetLine.ot2) : null,
            ot2_5: invoice.budgetLine.ot2_5 ? Number(invoice.budgetLine.ot2_5) : null,
            estimate: Number(invoice.budgetLine.estimate),
            actualSpent: Number(invoice.budgetLine.actualSpent),
          }
        : null,
    }));
  } catch (error) {
    console.error("Failed to fetch invoices:", error);
    return [];
  }
}

export async function deleteInvoice(invoiceId: string) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return { success: false, error: "Invoice not found" };
    }

    await prisma.invoice.delete({
      where: { id: invoiceId },
    });

    // Recalculate spent amounts
    await updateProjectSpent(invoice.projectId);
    if (invoice.budgetLineId) {
      await updateBudgetLineSpent(invoice.budgetLineId);
    }

    revalidatePath("/invoices");
    revalidatePath("/dashboard");
    revalidatePath("/projects");
    revalidatePath(`/projects/${invoice.projectId}`);

    return { success: true };
  } catch (error) {
    console.error("Failed to delete invoice:", error);
    return { success: false, error: "Failed to delete invoice" };
  }
}
