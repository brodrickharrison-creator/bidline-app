/**
 * Application Constants
 *
 * All magic strings, numbers, and configuration values are defined here.
 * This makes the codebase easier to maintain and update.
 */

import { ProjectStatus, BudgetCategory, InvoiceStatus } from "@prisma/client";

// ============================================================================
// PROJECT CONSTANTS
// ============================================================================

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNING: "Planning",
  LIVE: "Live",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  PLANNING: "bg-blue-100 text-blue-700",
  LIVE: "bg-green-100 text-green-700",
  COMPLETED: "bg-gray-100 text-gray-700",
  ARCHIVED: "bg-gray-100 text-gray-500",
};

// ============================================================================
// BUDGET CONSTANTS
// ============================================================================

export const BUDGET_CATEGORY_LABELS: Record<BudgetCategory, string> = {
  PRE_PRODUCTION: "Pre-Production Labor",
  PRODUCTION: "Production Labor",
  POST_PRODUCTION: "Post-Production Labor",
};

export const BUDGET_CATEGORIES: Array<{
  key: BudgetCategory;
  label: string;
}> = [
  { key: "PRE_PRODUCTION", label: "Pre-Production Labor" },
  { key: "PRODUCTION", label: "Production Labor" },
  { key: "POST_PRODUCTION", label: "Post-Production Labor" },
];

/**
 * Overtime multipliers for calculating budget estimates
 */
export const OVERTIME_MULTIPLIERS = {
  OT_1_5: 1.5,
  OT_2: 2.0,
  OT_2_5: 2.5,
} as const;

// ============================================================================
// INVOICE CONSTANTS
// ============================================================================

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  MISSING: "Missing",
  WAITING_APPROVAL: "Waiting Approval",
  APPROVED: "Approved",
  FLAGGED: "Flagged",
  PAID: "Paid",
};

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  MISSING: "bg-orange-100 text-orange-700",
  WAITING_APPROVAL: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  FLAGGED: "bg-red-100 text-red-700",
  PAID: "bg-blue-100 text-blue-700",
};

/**
 * Invoice statuses that count towards project spent totals
 */
export const COUNTED_INVOICE_STATUSES: InvoiceStatus[] = ["APPROVED", "PAID"];

// ============================================================================
// UI CONSTANTS
// ============================================================================

export const DEFAULT_CURRENCY = "USD";
export const CURRENCY_SYMBOL = "$";

export const ROUTES = {
  DASHBOARD: "/dashboard",
  PROJECTS: "/projects",
  PROJECT_NEW: "/projects/new",
  PROJECT_DETAIL: (id: string) => `/projects/${id}`,
  INVOICES: "/invoices",
  INVOICE_NEW: "/invoices/new",
  INVOICE_UPLOAD_WITH_PROJECT: (projectId: string) =>
    `/invoices/new?project=${projectId}`,
  CONTACTS: "/contacts",
  SETTINGS: "/settings",
} as const;

// ============================================================================
// TEMPORARY USER ID
// ============================================================================

/**
 * Temporary user ID used until authentication is implemented
 * TODO: Remove this once NextAuth is integrated
 */
export const TEMP_USER_ID = "temp-user-id";
export const TEMP_USER_EMAIL = "temp@example.com";
export const TEMP_USER_NAME = "Temporary User";

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

export const VALIDATION = {
  MIN_PROJECT_NAME_LENGTH: 1,
  MAX_PROJECT_NAME_LENGTH: 255,
  MIN_BUDGET_AMOUNT: 0,
  MAX_BUDGET_AMOUNT: 999999999.99,
} as const;
