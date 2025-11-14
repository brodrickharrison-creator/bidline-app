/**
 * Utility Functions
 *
 * Common helper functions used throughout the application.
 * These functions handle formatting, calculations, and data transformations.
 */

import { BudgetLineInput } from "@/types";
import { OVERTIME_MULTIPLIERS, CURRENCY_SYMBOL } from "./constants";
import { getRuleset, LineItemData } from "./rulesets";

// ============================================================================
// CURRENCY FORMATTING
// ============================================================================

/**
 * Formats a number as currency with proper locale formatting
 * @param amount - The amount to format
 * @param minimumFractionDigits - Minimum decimal places (default: 2)
 * @returns Formatted currency string (e.g., "$1,234.56")
 */
export function formatCurrency(
  amount: number,
  minimumFractionDigits: number = 2
): string {
  return `${CURRENCY_SYMBOL}${amount.toLocaleString("en-US", {
    minimumFractionDigits,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Formats currency without the dollar sign
 * @param amount - The amount to format
 * @returns Formatted number string (e.g., "1,234.56")
 */
export function formatNumber(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ============================================================================
// BUDGET CALCULATIONS
// ============================================================================

/**
 * Calculates the estimate for a single budget line item (LEGACY - FlatRate only)
 * Formula: (days × rate) + (ot1.5 × rate × 1.5) + (ot2 × rate × 2) + (ot2.5 × rate × 2.5)
 *
 * @deprecated Use calculateEstimateWithRuleset for new code
 * @param line - Budget line input with days, rate, and overtime values
 * @returns Total estimated cost for the line item
 */
export function calculateBudgetLineEstimate(line: {
  days?: number;
  rate?: number;
  ot1_5?: number;
  ot2?: number;
  ot2_5?: number;
}): number {
  const days = line.days || 0;
  const rate = line.rate || 0;
  const ot1_5 = line.ot1_5 || 0;
  const ot2 = line.ot2 || 0;
  const ot2_5 = line.ot2_5 || 0;

  const regularPay = days * rate;
  const overtime1_5 = ot1_5 * rate * OVERTIME_MULTIPLIERS.OT_1_5;
  const overtime2 = ot2 * rate * OVERTIME_MULTIPLIERS.OT_2;
  const overtime2_5 = ot2_5 * rate * OVERTIME_MULTIPLIERS.OT_2_5;

  return regularPay + overtime1_5 + overtime2 + overtime2_5;
}

/**
 * Calculates estimate using the specified ruleset (FlatRate or APA)
 * This is the preferred method for new code.
 *
 * @param line - Line item data
 * @param rulesetName - Ruleset name ("FLAT_RATE" or "APA")
 * @returns Total estimated cost using the specified ruleset
 */
export function calculateEstimateWithRuleset(
  line: LineItemData,
  rulesetName?: string | null
): number {
  const ruleset = getRuleset(rulesetName);
  return ruleset.calculateEstimate(line);
}

/**
 * Calculates overtime cost using the specified ruleset
 *
 * @param line - Line item data
 * @param rulesetName - Ruleset name ("FLAT_RATE" or "APA")
 * @returns Total overtime cost using the specified ruleset
 */
export function calculateOTWithRuleset(
  line: LineItemData,
  rulesetName?: string | null
): number {
  const ruleset = getRuleset(rulesetName);
  return ruleset.calculateOT(line);
}

/**
 * Calculates the total budget from all budget line items
 * @param budgetLines - Array of budget line inputs
 * @returns Total estimated budget
 */
export function calculateTotalBudget(budgetLines: BudgetLineInput[]): number {
  return budgetLines.reduce((sum, line) => {
    return sum + calculateBudgetLineEstimate(line);
  }, 0);
}

/**
 * Calculates variance between estimate and actual spent
 * Positive variance = under budget
 * Negative variance = over budget
 *
 * @param estimate - Estimated amount
 * @param actual - Actual spent amount
 * @returns Variance (estimate - actual)
 */
export function calculateVariance(estimate: number, actual: number): number {
  return estimate - actual;
}

/**
 * Determines if a project/line is over budget
 * @param estimate - Estimated amount
 * @param actual - Actual spent amount
 * @returns True if over budget (actual > estimate)
 */
export function isOverBudget(estimate: number, actual: number): boolean {
  return actual > estimate;
}

// ============================================================================
// DATE FORMATTING
// ============================================================================

/**
 * Formats a date to a readable string
 * @param date - Date to format
 * @returns Formatted date string (e.g., "Jan 1, 2024")
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

/**
 * Formats a date with time
 * @param date - Date to format
 * @returns Formatted date and time string (e.g., "Jan 1, 2024 at 3:45 PM")
 */
export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

// ============================================================================
// STRING UTILITIES
// ============================================================================

/**
 * Converts a status string from API format to display format
 * Example: "WAITING_APPROVAL" -> "Waiting Approval"
 *
 * @param status - Status string with underscores
 * @returns Formatted status string for display
 */
export function formatStatus(status: string): string {
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Generates initials from a name
 * @param name - Full name
 * @returns First letter of first name and last name (e.g., "John Doe" -> "JD")
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// ============================================================================
// URL UTILITIES
// ============================================================================

/**
 * Builds a shareable invoice upload URL with a pre-selected project
 * @param origin - Window origin (e.g., "http://localhost:3000")
 * @param projectId - Project ID to pre-select
 * @returns Full shareable URL
 */
export function buildInvoiceUploadUrl(origin: string, projectId: string): string {
  return `${origin}/invoices/new?project=${projectId}`;
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validates if a value is a positive number
 * @param value - Value to validate
 * @returns True if value is a positive number
 */
export function isPositiveNumber(value: number): boolean {
  return typeof value === "number" && value > 0 && !isNaN(value);
}

/**
 * Safely parses a float, returning 0 if invalid
 * @param value - String or number to parse
 * @returns Parsed float or 0
 */
export function safeParseFloat(value: string | number): number {
  const parsed = typeof value === "string" ? parseFloat(value) : value;
  return isNaN(parsed) ? 0 : parsed;
}

// ============================================================================
// APA RULESET UTILITIES
// ============================================================================

/**
 * Determines if a line item has any filled data
 * Used to filter out empty template lines in UI views
 *
 * @param line - Budget line with optional fields
 * @returns True if at least one quantity/time/rate field is filled
 */
export function hasFilledData(line: {
  quantity?: number | null;
  days?: number | null;
  rate?: number | null;
  ot1_5?: number | null;
  ot2?: number | null;
  ot2_5?: number | null;
  otHours?: number | null;
  midnightHours?: number | null;
}): boolean {
  return !!(
    line.quantity ||
    line.days ||
    line.rate ||
    line.ot1_5 ||
    line.ot2 ||
    line.ot2_5 ||
    line.otHours ||
    line.midnightHours
  );
}

/**
 * Calculate APA Base Hourly Rate (BHR)
 * Formula: rate / 10
 *
 * @param rate - Daily rate
 * @returns Base Hourly Rate
 */
export function calculateBHR(rate: number): number {
  return rate / 10;
}
