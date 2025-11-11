/**
 * Supabase Storage Utilities for Invoice File Management
 *
 * This module provides secure file upload/download functions for invoice attachments.
 * Files are stored in a private bucket with user-scoped access control.
 *
 * Storage Structure:
 * invoices/{userId}/{invoiceId}/{filename}
 *
 * Future Admin Support:
 * When implementing admin users, storage policies will need to be updated
 * to grant admins access across all user folders.
 */

import { createClient } from "@/lib/supabase/server";

const BUCKET_NAME = "invoices";
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export interface UploadInvoiceFileResult {
  success: boolean;
  fileUrl?: string;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  fileMimeType?: string;
  error?: string;
}

/**
 * Upload an invoice file to Supabase Storage
 *
 * @param userId - The authenticated user's ID
 * @param invoiceId - The invoice ID to associate the file with
 * @param file - The file to upload (File or Blob)
 * @param fileName - Original filename
 * @returns Upload result with file URL and metadata
 */
export async function uploadInvoiceFile(
  userId: string,
  invoiceId: string,
  file: File | Blob,
  fileName: string
): Promise<UploadInvoiceFileResult> {
  try {
    // Validation
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      };
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        success: false,
        error: `File type ${file.type} is not allowed. Allowed types: PDF, images, Excel files`,
      };
    }

    const supabase = await createClient();

    // Generate unique file path: invoices/{userId}/{invoiceId}/{timestamp}-{filename}
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `${userId}/${invoiceId}/${timestamp}-${sanitizedFileName}`;

    // Upload file to storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false, // Don't allow overwriting
      });

    if (error) {
      console.error("Storage upload error:", error);
      return {
        success: false,
        error: `Failed to upload file: ${error.message}`,
      };
    }

    // Get public URL (even though bucket is private, this generates the path)
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return {
      success: true,
      fileUrl: urlData.publicUrl,
      filePath: data.path,
      fileName: sanitizedFileName,
      fileSize: file.size,
      fileMimeType: file.type,
    };
  } catch (error: unknown) {
    console.error("Upload invoice file error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload file",
    };
  }
}

/**
 * Get a signed URL for downloading a private invoice file
 *
 * @param filePath - The storage path of the file
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns Signed URL for temporary download access
 */
export async function getInvoiceFileUrl(
  filePath: string,
  expiresIn: number = 3600
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error("Get signed URL error:", error);
      return {
        success: false,
        error: `Failed to get file URL: ${error.message}`,
      };
    }

    return {
      success: true,
      url: data.signedUrl,
    };
  } catch (error: unknown) {
    console.error("Get invoice file URL error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get file URL",
    };
  }
}

/**
 * Delete an invoice file from storage
 *
 * @param filePath - The storage path of the file to delete
 * @returns Success/failure result
 */
export async function deleteInvoiceFile(
  filePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error("Delete file error:", error);
      return {
        success: false,
        error: `Failed to delete file: ${error.message}`,
      };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("Delete invoice file error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete file",
    };
  }
}

/**
 * Download invoice file as a blob
 *
 * @param filePath - The storage path of the file
 * @returns File blob and metadata
 */
export async function downloadInvoiceFile(
  filePath: string
): Promise<{
  success: boolean;
  data?: Blob;
  fileName?: string;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(filePath);

    if (error) {
      console.error("Download file error:", error);
      return {
        success: false,
        error: `Failed to download file: ${error.message}`,
      };
    }

    // Extract filename from path
    const fileName = filePath.split("/").pop() || "invoice-file";

    return {
      success: true,
      data,
      fileName,
    };
  } catch (error: unknown) {
    console.error("Download invoice file error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to download file",
    };
  }
}

/**
 * Check if user has access to a file (validates ownership)
 * Future: Update to check for admin role
 *
 * @param userId - Current user's ID
 * @param filePath - File path to check
 * @returns Whether user has access
 */
export function validateFileAccess(userId: string, filePath: string): boolean {
  // File path format: {userId}/{invoiceId}/{filename}
  const pathParts = filePath.split("/");
  const fileUserId = pathParts[0];

  // TODO: When implementing admin role, add check:
  // if (user.role === "ADMIN") return true;

  return fileUserId === userId;
}
