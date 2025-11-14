"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { createProject } from "@/app/actions/projects";
import { getDefaultLineItemTemplates } from "@/app/actions/templates";
import { useRouter } from "next/navigation";
import { calculateEstimateWithRuleset } from "@/lib/utils";

type BudgetLine = {
  id: string;
  category: string;
  lineNumber: number;
  name: string;
  quantity: number | null;
  days: number | null;
  rate: number | null;
  ot1_5: number | null;
  ot2: number | null;
  ot2_5: number | null;
  otHours?: number | null;
  midnightHours?: number | null;
};

export default function NewProjectPage() {
  const router = useRouter();
  const [projectName, setProjectName] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [clientName, setClientName] = useState("");
  const [ruleset, setRuleset] = useState<"FLAT_RATE" | "APA">("FLAT_RATE");
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load line item templates on mount
  useEffect(() => {
    async function loadTemplates() {
      setIsLoading(true);
      try {
        const templates = await getDefaultLineItemTemplates();

        // Convert templates to budget lines
        const lines: BudgetLine[] = templates.map((template, index) => ({
          id: `line-${template.id}`,
          category: template.category,
          lineNumber: index + 1,
          name: template.role,
          quantity: null,
          days: null,
          rate: null,
          ot1_5: null,
          ot2: null,
          ot2_5: null,
          otHours: null,
          midnightHours: null,
        }));

        setBudgetLines(lines);

        // Extract unique categories
        const uniqueCategories = Array.from(new Set(templates.map(t => t.category))).sort();
        setCategories(uniqueCategories);
      } catch (err) {
        console.error("Failed to load templates:", err);
        setError("Failed to load line item templates");
      } finally {
        setIsLoading(false);
      }
    }

    loadTemplates();
  }, []);

  const updateLine = (id: string, field: keyof BudgetLine, value: string | number) => {
    setBudgetLines((lines) =>
      lines.map((line) => {
        if (line.id !== id) return line;

        // Handle name field as string, numeric fields as numbers or null
        if (field === "name") {
          return { ...line, [field]: String(value) };
        } else {
          // Convert empty strings to null, otherwise parse as number
          const numValue = typeof value === "string" ? (value === "" ? null : parseFloat(value) || null) : value;
          return { ...line, [field]: numValue };
        }
      })
    );
  };

  const addLine = (category: BudgetLine["category"]) => {
    const maxLineNumber = Math.max(...budgetLines.map((l) => l.lineNumber), 0);
    setBudgetLines([
      ...budgetLines,
      {
        id: `line-${Date.now()}`,
        category,
        lineNumber: maxLineNumber + 1,
        name: "New Line Item",
        quantity: null,
        days: null,
        rate: null,
        ot1_5: null,
        ot2: null,
        ot2_5: null,
        otHours: null,
        midnightHours: null,
      },
    ]);
  };

  const removeLine = (id: string) => {
    setBudgetLines((lines) => lines.filter((line) => line.id !== id));
  };

  const totalEstimate = budgetLines.reduce((sum, line) => {
    return sum + calculateEstimateWithRuleset(line, ruleset);
  }, 0);

  // Group lines by category dynamically
  const groupedLines = budgetLines.reduce((acc, line) => {
    if (!acc[line.category]) {
      acc[line.category] = [];
    }
    acc[line.category].push(line);
    return acc;
  }, {} as Record<string, BudgetLine[]>);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectName.trim()) {
      setError("Project name is required");
      return;
    }

    if (!projectCode.trim()) {
      setError("Project code is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createProject({
        name: projectName,
        projectCode: projectCode.trim(),
        clientName: clientName || "",
        ruleset: ruleset,
        budgetLines: budgetLines.map((line) => ({
          category: line.category,
          lineNumber: line.lineNumber,
          name: line.name,
          quantity: line.quantity,
          days: line.days,
          rate: line.rate,
          ot1_5: line.ot1_5,
          ot2: line.ot2,
          ot2_5: line.ot2_5,
        })),
      });

      if (result.success) {
        router.push("/projects");
      } else {
        setError(result.error || "Failed to create project");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <Link href="/projects" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Projects
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Start a New Budget</h1>
        <p className="text-gray-500">Set up your project budget and details.</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-6xl">
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          {/* Project Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Name *
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter project name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Name
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Enter client name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Project Code */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Code *
            </label>
            <input
              type="text"
              value={projectCode}
              onChange={(e) => setProjectCode(e.target.value)}
              placeholder="e.g., 2025_COKE_SIZZLE"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              required
              maxLength={50}
            />
            <p className="mt-2 text-sm text-gray-500">
              This code will help match invoices and exports to this budget.
            </p>
          </div>

          {/* Budget Ruleset Selector */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Budget Calculation Ruleset *
            </label>
            <select
              value={ruleset}
              onChange={(e) => setRuleset(e.target.value as "FLAT_RATE" | "APA")}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              required
            >
              <option value="FLAT_RATE">Flat Rate (Traditional OT Calculation)</option>
              <option value="APA">APA (Associated Production Agreement)</option>
            </select>
            <p className="mt-2 text-sm text-gray-500">
              {ruleset === "FLAT_RATE"
                ? "Standard overtime calculation using 1.5x, 2.0x, and 2.5x multipliers."
                : "APA-compliant calculation using Base Hourly Rate (BHR) and tiered multipliers based on daily rate."}
            </p>
            <p className="mt-1 text-xs text-orange-600 font-medium">
              ⚠️ This cannot be changed after project creation
            </p>
          </div>

          {/* Budget Breakdown */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold">Budget Breakdown</h2>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                  ruleset === "APA"
                    ? "bg-purple-100 text-purple-700"
                    : "bg-blue-100 text-blue-700"
                }`}>
                  {ruleset === "APA" ? "APA Rules Applied" : "Flat Rate Rules Applied"}
                </span>
              </div>
              <div className="flex gap-3 items-center">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none bg-white bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22M6%208l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25em] bg-[right_0.5rem_center] bg-no-repeat"
                >
                  <option value="All">All Categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      addLine(e.target.value);
                      e.target.value = ""; // Reset dropdown
                    }
                  }}
                  className="text-sm border border-gray-300 rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none bg-white bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22M6%208l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25em] bg-[right_0.5rem_center] bg-no-repeat"
                >
                  <option value="">+ Add Line</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Unified Spreadsheet Table */}
            <div className="overflow-hidden border border-gray-300 rounded-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-100 border-b border-gray-300">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 w-12 border-r border-gray-300"></th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-r border-gray-300"></th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-700 w-20 border-r border-gray-300">No</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-700 w-20 border-r border-gray-300">Days</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-700 w-24 border-r border-gray-300">Rate</th>
                    {ruleset === "FLAT_RATE" ? (
                      <>
                        <th className="px-3 py-2 text-center font-semibold text-gray-700 w-20 border-r border-gray-300">1.5 OT</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-700 w-20 border-r border-gray-300">2 OT</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-700 w-20 border-r border-gray-300">2.5 OT</th>
                      </>
                    ) : (
                      <>
                        <th className="px-3 py-2 text-center font-semibold text-gray-700 w-24 border-r border-gray-300">OT Hours</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-700 w-24 border-r border-gray-300">Midnight Hours</th>
                      </>
                    )}
                    <th className="px-3 py-2 text-right font-semibold text-gray-700 w-32 border-r border-gray-300">Estimate</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={10} className="px-3 py-8 text-center text-gray-500">
                        Loading templates...
                      </td>
                    </tr>
                  ) : categories.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-3 py-8 text-center text-gray-500">
                        No line item templates found. Please run the database seed script.
                      </td>
                    </tr>
                  ) : (
                    categories
                      .filter((category) => categoryFilter === "All" || category === categoryFilter)
                      .map((category, catIndex) => {
                        const lines = groupedLines[category] || [];
                        const categoryLetter = String.fromCharCode(65 + catIndex); // A, B, C, etc.

                        // Calculate category subtotal
                        const categorySubtotal = lines.reduce((sum, line) => {
                          return sum + calculateEstimateWithRuleset(line, ruleset);
                        }, 0);

                    return (
                      <React.Fragment key={category}>
                        {/* Category Header Row */}
                        <tr className="bg-gray-50 border-t border-gray-300">
                          <td className="px-3 py-2 font-semibold text-gray-700 border-r border-gray-300">{categoryLetter}</td>
                          <td colSpan={9} className="px-3 py-2 font-semibold text-gray-700">
                            {category}
                          </td>
                        </tr>

                        {/* Line Items */}
                        {lines.map((line) => (
                          <tr key={line.id} className="border-t border-gray-200 hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-500 text-center border-r border-gray-300">{line.lineNumber}</td>
                            <td className="px-3 py-2 border-r border-gray-300">
                              <input
                                type="text"
                                value={line.name}
                                onChange={(e) => updateLine(line.id, "name", e.target.value)}
                                className="w-full border-0 bg-transparent focus:ring-0 p-0 text-sm"
                              />
                            </td>
                            <td className="px-3 py-2 border-r border-gray-300">
                              <input
                                type="number"
                                value={line.quantity || ""}
                                onChange={(e) => updateLine(line.id, "quantity", e.target.value)}
                                className="w-full text-center border-0 bg-transparent focus:ring-0 p-0 text-sm"
                                min="0"
                                step="1"
                              />
                            </td>
                            <td className="px-3 py-2 border-r border-gray-300">
                              <input
                                type="number"
                                value={line.days || ""}
                                onChange={(e) => updateLine(line.id, "days", e.target.value)}
                                className="w-full text-center border-0 bg-transparent focus:ring-0 p-0 text-sm"
                                min="0"
                                step="0.5"
                              />
                            </td>
                            <td className="px-3 py-2 border-r border-gray-300">
                              <input
                                type="number"
                                value={line.rate || ""}
                                onChange={(e) => updateLine(line.id, "rate", e.target.value)}
                                className="w-full text-center border-0 bg-transparent focus:ring-0 p-0 text-sm"
                                min="0"
                                step="1"
                              />
                            </td>
                            {ruleset === "FLAT_RATE" ? (
                              <>
                                <td className="px-3 py-2 border-r border-gray-300">
                                  <input
                                    type="number"
                                    value={line.ot1_5 || ""}
                                    onChange={(e) => updateLine(line.id, "ot1_5", e.target.value)}
                                    className="w-full text-center border-0 bg-transparent focus:ring-0 p-0 text-sm"
                                    min="0"
                                    step="0.5"
                                  />
                                </td>
                                <td className="px-3 py-2 border-r border-gray-300">
                                  <input
                                    type="number"
                                    value={line.ot2 || ""}
                                    onChange={(e) => updateLine(line.id, "ot2", e.target.value)}
                                    className="w-full text-center border-0 bg-transparent focus:ring-0 p-0 text-sm"
                                    min="0"
                                    step="0.5"
                                  />
                                </td>
                                <td className="px-3 py-2 border-r border-gray-300">
                                  <input
                                    type="number"
                                    value={line.ot2_5 || ""}
                                    onChange={(e) => updateLine(line.id, "ot2_5", e.target.value)}
                                    className="w-full text-center border-0 bg-transparent focus:ring-0 p-0 text-sm"
                                    min="0"
                                    step="0.5"
                                  />
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-3 py-2 border-r border-gray-300">
                                  <input
                                    type="number"
                                    value={line.otHours || ""}
                                    onChange={(e) => updateLine(line.id, "otHours", e.target.value)}
                                    className="w-full text-center border-0 bg-transparent focus:ring-0 p-0 text-sm"
                                    min="0"
                                    step="0.5"
                                  />
                                </td>
                                <td className="px-3 py-2 border-r border-gray-300">
                                  <input
                                    type="number"
                                    value={line.midnightHours || ""}
                                    onChange={(e) => updateLine(line.id, "midnightHours", e.target.value)}
                                    className="w-full text-center border-0 bg-transparent focus:ring-0 p-0 text-sm"
                                    min="0"
                                    step="0.5"
                                  />
                                </td>
                              </>
                            )}
                            <td className="px-3 py-2 text-right font-medium text-sm border-r border-gray-300">
                              ${calculateEstimateWithRuleset(line, ruleset).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => removeLine(line.id)}
                                className="text-gray-400 hover:text-red-600"
                                title="Remove line"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}

                        {/* Category Subtotal Row */}
                        <tr className="bg-gray-100 border-t-2 border-gray-400">
                          <td className="px-3 py-2 border-r border-gray-300"></td>
                          <td colSpan={ruleset === "FLAT_RATE" ? 6 : 6} className="px-3 py-2 text-right font-semibold text-gray-700">
                            Subtotal:
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-gray-900 border-r border-gray-300">
                            ${categorySubtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-2"></td>
                        </tr>
                      </React.Fragment>
                    );
                      })
                  )}
                </tbody>
              </table>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200">
            <div>
              <p className="text-sm text-gray-600 mb-1">Estimated Total Budget</p>
              <p className="text-3xl font-bold text-green-600">
                ${totalEstimate.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/projects"
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Saving..." : "Save Project"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
