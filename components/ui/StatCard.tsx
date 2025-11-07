/**
 * StatCard Component
 *
 * Displays a statistic with a label and value.
 * Used on Dashboard and Project Detail pages for showing financial summaries.
 */

import { formatCurrency } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number;
  format?: "currency" | "number";
  valueColor?: "default" | "green" | "red";
}

export function StatCard({
  label,
  value,
  format = "currency",
  valueColor = "default",
}: StatCardProps) {
  const formattedValue =
    format === "currency"
      ? formatCurrency(value)
      : value.toLocaleString("en-US");

  const colorClass = {
    default: "text-gray-900",
    green: "text-green-600",
    red: "text-red-600",
  }[valueColor];

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colorClass}`}>{formattedValue}</p>
    </div>
  );
}
