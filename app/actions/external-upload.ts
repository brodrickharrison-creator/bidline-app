/**
 * External Invoice Upload Actions
 *
 * Handles invoice uploads from external vendors (public-facing).
 * Automatically matches invoices to payees based on email address.
 */

"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface ExternalInvoiceUpload {
  email: string;
  amount: number;
  projectCode: string;
  fileName?: string;
}

interface UploadResult {
  success: boolean;
  error?: string;
  invoice?: {
    id: string;
    invoiceNumber: string | null;
    amount: number;
    status: string;
    createdAt: Date;
    payeeName: string | null;
    projectName: string | null;
  };
}

/**
 * Handles external invoice upload from public form
 *
 * Auto-Matching Flow:
 * 1. Find payee by email
 * 2. Find project by projectCode (matching the payee's user)
 * 3. Find budget line within project where payee is assigned (if exists)
 * 4. Create invoice with project AND budget line assignment (if matched)
 * 5. Set status to WAITING_APPROVAL for producer review
 */
export async function uploadExternalInvoice(
  data: ExternalInvoiceUpload
): Promise<UploadResult> {
  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return { success: false, error: "Invalid email address" };
    }

    // Validate amount
    if (!data.amount || data.amount <= 0) {
      return { success: false, error: "Invalid amount" };
    }

    // Validate project code
    if (!data.projectCode || !data.projectCode.trim()) {
      return { success: false, error: "Project code is required" };
    }

    // Find payee by email
    const payee = await prisma.contact.findFirst({
      where: {
        email: {
          equals: data.email,
          mode: "insensitive", // Case-insensitive match
        },
      },
    });

    if (!payee) {
      return {
        success: false,
        error: "Email not found in our system. Please contact the production team.",
      };
    }

    // Find project by projectCode (must belong to the same user as the payee for security)
    const project = await prisma.project.findFirst({
      where: {
        projectCode: data.projectCode.trim(),
        userId: payee.userId, // Ensure project belongs to the same user as the payee
      },
    });

    if (!project) {
      return {
        success: false,
        error: "Project code not found or does not match your account. Please verify the project code with the production team.",
      };
    }

    // Try to find a matching budget line within the project where this payee is assigned
    const matchingBudgetLine = await prisma.budgetLine.findFirst({
      where: {
        projectId: project.id,
        payeeId: payee.id,
      },
      orderBy: {
        createdAt: "asc", // Use the first/oldest budget line if multiple exist
      },
    });

    // Create the invoice with project and budget line assignment (if found)
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: null, // Can be set later by producer if needed
        amount: data.amount,
        status: "WAITING_APPROVAL",
        payeeId: payee.id,
        projectId: project.id, // Auto-assigned based on project code
        budgetLineId: matchingBudgetLine?.id || null, // Auto-assigned if payee matches a budget line
      },
      include: {
        payee: true,
        project: true,
        budgetLine: true,
      },
    });

    // Revalidate affected pages
    revalidatePath("/invoices");
    revalidatePath("/dashboard");
    revalidatePath(`/projects/${project.id}`);

    return {
      success: true,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: Number(invoice.amount),
        status: invoice.status,
        createdAt: invoice.createdAt,
        payeeName: invoice.payee?.name || null,
        projectName: invoice.project?.name || null, // Auto-assigned project
      },
    };
  } catch (error) {
    console.error("Failed to upload external invoice:", error);
    return {
      success: false,
      error: "Failed to upload invoice. Please try again.",
    };
  }
}

/**
 * Checks if an email exists in the system (for validation)
 */
export async function validatePayeeEmail(email: string): Promise<boolean> {
  try {
    const payee = await prisma.contact.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
    });
    return !!payee;
  } catch (error) {
    console.error("Failed to validate email:", error);
    return false;
  }
}
