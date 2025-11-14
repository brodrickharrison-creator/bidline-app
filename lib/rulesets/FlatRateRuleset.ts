/**
 * FlatRate Ruleset Implementation
 *
 * Implements the traditional flat-rate overtime calculation logic.
 * This is the default ruleset for existing projects.
 *
 * Formula: estimate = (days × rate) + (ot1.5 × rate × 1.5) + (ot2 × rate × 2) + (ot2.5 × rate × 2.5)
 */

import { BudgetRuleset, LineItemData, FLAT_RATE_MULTIPLIERS } from "./types";

export class FlatRateRuleset implements BudgetRuleset {
  getName(): string {
    return "FlatRate";
  }

  /**
   * Calculate total estimate for a line item
   * Includes base days + all overtime at their respective multipliers
   */
  calculateEstimate(lineItem: LineItemData): number {
    const rate = lineItem.rate || 0;
    const days = lineItem.days || 0;

    // Base amount (days × rate)
    const baseAmount = days * rate;

    // Calculate overtime
    const otAmount = this.calculateOT(lineItem);

    return baseAmount + otAmount;
  }

  /**
   * Calculate overtime cost
   * Formula: (ot1.5 × rate × 1.5) + (ot2 × rate × 2) + (ot2.5 × rate × 2.5)
   */
  calculateOT(lineItem: LineItemData): number {
    const rate = lineItem.rate || 0;
    const ot1_5 = lineItem.ot1_5 || 0;
    const ot2 = lineItem.ot2 || 0;
    const ot2_5 = lineItem.ot2_5 || 0;

    const ot1_5_amount = ot1_5 * rate * FLAT_RATE_MULTIPLIERS.OT_1_5;
    const ot2_amount = ot2 * rate * FLAT_RATE_MULTIPLIERS.OT_2;
    const ot2_5_amount = ot2_5 * rate * FLAT_RATE_MULTIPLIERS.OT_2_5;

    return ot1_5_amount + ot2_amount + ot2_5_amount;
  }
}
