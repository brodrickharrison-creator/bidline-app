/**
 * APA Ruleset System - Main Entry Point
 *
 * Provides a unified interface for accessing budget rulesets.
 * Exports all types, implementations, and helper functions.
 */

import { FlatRateRuleset } from "./FlatRateRuleset";
import { APARuleset } from "./APARuleset";
import { BudgetRuleset } from "./types";

// Export all types
export * from "./types";

// Export ruleset implementations
export { FlatRateRuleset } from "./FlatRateRuleset";
export { APARuleset } from "./APARuleset";

/**
 * Ruleset registry
 * Maps ruleset names to their implementations
 */
const rulesets: Record<string, BudgetRuleset> = {
  FLAT_RATE: new FlatRateRuleset(),
  FlatRate: new FlatRateRuleset(), // Support both naming conventions
  APA: new APARuleset(),
};

/**
 * Get a ruleset implementation by name
 *
 * @param name - Ruleset name ("APA" or "FLAT_RATE"/"FlatRate")
 * @returns BudgetRuleset implementation
 *
 * @example
 * ```ts
 * const ruleset = getRuleset(project.ruleset);
 * const estimate = ruleset.calculateEstimate(lineItem);
 * ```
 */
export function getRuleset(
  name: string | undefined | null
): BudgetRuleset {
  // Default to FlatRate if no ruleset specified
  if (!name) {
    return rulesets.FLAT_RATE;
  }

  // Lookup ruleset (case-insensitive)
  const ruleset = rulesets[name] || rulesets[name.toUpperCase()];

  // Default to FlatRate if unknown ruleset
  if (!ruleset) {
    console.warn(`Unknown ruleset: ${name}, defaulting to FlatRate`);
    return rulesets.FLAT_RATE;
  }

  return ruleset;
}

/**
 * Get all available ruleset names
 * Useful for dropdown/select options in UI
 */
export function getAvailableRulesets(): string[] {
  return ["FLAT_RATE", "APA"];
}

/**
 * Check if a ruleset name is valid
 */
export function isValidRuleset(name: string): boolean {
  return getAvailableRulesets().includes(name.toUpperCase());
}
