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
  invoiceNumber?: string;
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
 * New Flow (Unassigned Invoices):
 * 1. Find payee by email
 * 2. Create invoice without project or budget line assignment
 * 3. Producer will manually assign to correct line item later
 * 4. Set status to WAITING_APPROVAL
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

    // Create the invoice WITHOUT project or budget line assignment
    // Producer will assign it manually later
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: data.invoiceNumber || null,
        amount: data.amount,
        status: "WAITING_APPROVAL",
        payeeId: payee.id,
        // Leave projectId and budgetLineId as null - unassigned
      },
      include: {
        payee: true,
        project: true,
      },
    });

    // Revalidate affected pages
    revalidatePath("/invoices");
    revalidatePath("/dashboard");

    return {
      success: true,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: Number(invoice.amount),
        status: invoice.status,
        createdAt: invoice.createdAt,
        payeeName: invoice.payee?.name || null,
        projectName: null, // No project assigned yet
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
