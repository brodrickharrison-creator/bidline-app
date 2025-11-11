import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { getInvoiceFileUrl, validateFileAccess } from "@/lib/supabase/storage";

/**
 * API Route: Download Invoice File
 *
 * GET /api/invoices/:id/download
 *
 * Returns a signed URL for downloading the invoice file attachment.
 * Validates that the requesting user owns the invoice before granting access.
 *
 * Security:
 * - Requires authentication
 * - Validates invoice ownership through project.userId
 * - Future: Will support admin role for cross-user access
 *
 * @param request - Next.js request object
 * @param params - Route params containing invoice ID
 * @returns Signed download URL or error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - please log in" },
        { status: 401 }
      );
    }

    const invoiceId = params.id;

    // Fetch invoice with project to verify ownership
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        project: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Verify user owns this invoice's project
    // TODO: When implementing admin role, add check:
    // if (user.role !== "ADMIN" && invoice.project.userId !== user.id)
    if (invoice.project.userId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized - you do not have access to this invoice" },
        { status: 403 }
      );
    }

    // Check if invoice has a file
    if (!invoice.filePath) {
      return NextResponse.json(
        { error: "No file attached to this invoice" },
        { status: 404 }
      );
    }

    // Validate file access (double-check ownership through file path)
    if (!validateFileAccess(user.id, invoice.filePath)) {
      return NextResponse.json(
        { error: "Unauthorized - file access denied" },
        { status: 403 }
      );
    }

    // Get signed URL for download (valid for 1 hour)
    const result = await getInvoiceFileUrl(invoice.filePath, 3600);

    if (!result.success || !result.url) {
      return NextResponse.json(
        { error: result.error || "Failed to generate download URL" },
        { status: 500 }
      );
    }

    // Return download URL
    return NextResponse.json({
      url: result.url,
      fileName: invoice.fileName,
      fileSize: invoice.fileSize,
      fileMimeType: invoice.fileMimeType,
      expiresIn: 3600, // seconds
    });
  } catch (error: any) {
    console.error("Invoice download API error:", error);
    return NextResponse.json(
      { error: "Failed to generate download URL" },
      { status: 500 }
    );
  }
}
