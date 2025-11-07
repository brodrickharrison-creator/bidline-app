/**
 * StatusBadge Component
 *
 * Displays a colored badge for different status types (Project, Invoice, etc.)
 * Uses consistent styling from constants for all status types.
 */

import {
  PROJECT_STATUS_COLORS,
  INVOICE_STATUS_COLORS,
  PROJECT_STATUS_LABELS,
  INVOICE_STATUS_LABELS,
} from "@/lib/constants";
import { ProjectStatus, InvoiceStatus } from "@prisma/client";

interface StatusBadgeProps {
  status: ProjectStatus | InvoiceStatus;
  type: "project" | "invoice";
}

export function StatusBadge({ status, type }: StatusBadgeProps) {
  const colorClass =
    type === "project"
      ? PROJECT_STATUS_COLORS[status as ProjectStatus]
      : INVOICE_STATUS_COLORS[status as InvoiceStatus];

  const label =
    type === "project"
      ? PROJECT_STATUS_LABELS[status as ProjectStatus]
      : INVOICE_STATUS_LABELS[status as InvoiceStatus];

  return (
    <span
      className={`px-3 py-1 rounded-full text-sm font-medium uppercase ${colorClass}`}
    >
      {label}
    </span>
  );
}
