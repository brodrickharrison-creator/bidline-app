/**
 * APA Ruleset System - Type Definitions
 *
 * Defines the modular ruleset architecture for budget calculations.
 * Supports both FlatRate and APA calculation logic.
 */

/**
 * Line item data structure for ruleset calculations
 */
export interface LineItemData {
  rate: number;
  days?: number;
  // FlatRate OT fields
  ot1_5?: number;  // Hours at 1.5x rate
  ot2?: number;    // Hours at 2.0x rate
  ot2_5?: number;  // Hours at 2.5x rate
  // APA-specific OT fields
  otHours?: number;        // General OT hours (uses tiered multiplier)
  midnightHours?: number;  // Midnight OT hours (3.0x multiplier)
  // Metadata
  isAPA?: boolean;
  unit?: "DAY" | "HOUR" | "FLAT";
  role?: string;
  rateSource?: string;
}

/**
 * Project configuration for ruleset selection
 */
export interface ProjectConfig {
  ruleset: "APA" | "FLAT_RATE";
  approvedOverrides?: Record<string, number>;  // Role -> custom rate
  APA_compliance_flags?: string[];
}

/**
 * Invoice metadata for rate validation
 */
export interface InvoiceMetadata {
  lineItemId: string;
  payee: string;
  amount: number;
  status?: "matched" | "rateMismatch" | "pending";
}

/**
 * Core interface for budget ruleset implementations
 *
 * Each ruleset (FlatRate, APA) implements this interface to provide
 * calculation logic for estimates and overtime.
 */
export interface BudgetRuleset {
  /**
   * Calculate the total estimate for a line item
   * @param lineItem - Line item data with rate, days, and OT fields
   * @returns Total estimated cost
   */
  calculateEstimate(lineItem: LineItemData): number;

  /**
   * Calculate overtime cost for a line item
   * @param lineItem - Line item data with OT hours
   * @returns Total overtime cost
   */
  calculateOT(lineItem: LineItemData): number;

  /**
   * Get the ruleset name
   */
  getName(): string;
}

/**
 * APA rate tier thresholds
 * Used to determine overtime multipliers based on daily rate
 */
export const APA_RATE_THRESHOLDS = {
  LOW: 426,    // rate <= 426: 1.5x multiplier
  MID: 650,    // 427-650: 1.25x multiplier
  HIGH: 651,   // rate >= 651: 1.0x multiplier
} as const;

/**
 * APA overtime multipliers by rate tier
 */
export const APA_OT_MULTIPLIERS = {
  LOW: 1.5,    // For rates <= 426
  MID: 1.25,   // For rates 427-650
  HIGH: 1.0,   // For rates >= 651
} as const;

/**
 * APA midnight overtime multiplier (always 3.0x)
 */
export const APA_MIDNIGHT_MULTIPLIER = 3.0;

/**
 * FlatRate overtime multipliers
 */
export const FLAT_RATE_MULTIPLIERS = {
  OT_1_5: 1.5,
  OT_2: 2.0,
  OT_2_5: 2.5,
} as const;
