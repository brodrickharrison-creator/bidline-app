/**
 * APA Ruleset Implementation
 *
 * Implements the Associated Production Agreement (APA) overtime calculation logic.
 * Uses Base Hourly Rate (BHR) and tiered multipliers based on daily rate.
 *
 * Key Concepts:
 * - BHR = rate / 10
 * - OT multiplier varies by rate tier (1.5x, 1.25x, or 1.0x)
 * - Midnight OT always uses 3.0x multiplier
 *
 * Rate Tiers:
 * - Low (≤$426/day): 1.5x multiplier
 * - Mid ($427-$650/day): 1.25x multiplier
 * - High (≥$651/day): 1.0x multiplier
 */

import {
  BudgetRuleset,
  LineItemData,
  APA_RATE_THRESHOLDS,
  APA_OT_MULTIPLIERS,
  APA_MIDNIGHT_MULTIPLIER,
} from "./types";

export class APARuleset implements BudgetRuleset {
  getName(): string {
    return "APA";
  }

  /**
   * Calculate total estimate for a line item
   * Formula: (quantity × days × rate) + OT + Midnight OT
   */
  calculateEstimate(lineItem: LineItemData): number {
    const rate = lineItem.rate || 0;
    const quantity = lineItem.quantity || 0;
    const days = lineItem.days || 0;

    // Base amount (quantity × days × rate)
    const baseAmount = quantity * days * rate;

    // Calculate overtime
    const otAmount = this.calculateOT(lineItem);

    return baseAmount + otAmount;
  }

  /**
   * Calculate total overtime cost
   * Includes both general OT (tiered multiplier) and midnight OT (3.0x)
   *
   * Formula:
   * - OT Total = No × OT Hours × (Rate ÷ 10) × OT Grade Multiplier
   * - Midnight Total = No × Midnight Hours × (Rate ÷ 10) × 3
   *
   * Note: "No" represents number of people - each person worked the OT/midnight hours
   */
  calculateOT(lineItem: LineItemData): number {
    const rate = lineItem.rate || 0;
    const quantity = lineItem.quantity || 0;  // Number of people
    const otHours = lineItem.otHours || 0;  // Actual OT hours per person
    const midnightHours = lineItem.midnightHours || 0;  // Midnight hours per person

    // Calculate BHR (Base Hourly Rate)
    const bhr = this.calculateBHR(rate);

    // Get tiered multiplier based on rate
    const otMultiplier = this.getOTMultiplier(rate);

    // Calculate general OT: No × OT Hours × BHR × OT Grade Multiplier
    const generalOT = quantity * otHours * bhr * otMultiplier;

    // Calculate midnight OT: No × Midnight Hours × BHR × 3.0
    const midnightOT = quantity * midnightHours * bhr * APA_MIDNIGHT_MULTIPLIER;

    return generalOT + midnightOT;
  }

  /**
   * Calculate Base Hourly Rate (BHR)
   * Formula: rate / 10
   */
  private calculateBHR(rate: number): number {
    return rate / 10;
  }

  /**
   * Determine OT multiplier based on daily rate tier
   * - Low tier (≤$426): 1.5x
   * - Mid tier ($427-$650): 1.25x
   * - High tier (≥$651): 1.0x
   */
  private getOTMultiplier(rate: number): number {
    if (rate <= APA_RATE_THRESHOLDS.LOW) {
      return APA_OT_MULTIPLIERS.LOW; // 1.5x
    } else if (rate <= APA_RATE_THRESHOLDS.MID) {
      return APA_OT_MULTIPLIERS.MID; // 1.25x
    } else {
      return APA_OT_MULTIPLIERS.HIGH; // 1.0x
    }
  }

  /**
   * Helper method to get the rate tier name for a given rate
   * Useful for UI display and debugging
   */
  getRateTier(rate: number): "LOW" | "MID" | "HIGH" {
    if (rate <= APA_RATE_THRESHOLDS.LOW) {
      return "LOW";
    } else if (rate <= APA_RATE_THRESHOLDS.MID) {
      return "MID";
    } else {
      return "HIGH";
    }
  }
}
