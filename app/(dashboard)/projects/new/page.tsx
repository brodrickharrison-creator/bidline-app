"use client";

import React, { useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { createProject, type BudgetLineInput } from "@/app/actions/projects";
import { useRouter } from "next/navigation";

type BudgetLine = {
  id: string;
  category: "PRE_PRODUCTION" | "PRODUCTION" | "POST_PRODUCTION";
  lineNumber: number;
  name: string;
  quantity: number;
  days: number;
  rate: number;
  ot1_5: number;
  ot2: number;
  ot2_5: number;
};

const defaultLines: Omit<BudgetLine, "id">[] = [
  { category: "PRE_PRODUCTION", lineNumber: 1, name: "Line Producer", quantity: 0, days: 0, rate: 0, ot1_5: 0, ot2: 0, ot2_5: 0 },
  { category: "PRE_PRODUCTION", lineNumber: 2, name: "Director Prep Days", quantity: 0, days: 0, rate: 0, ot1_5: 0, ot2: 0, ot2_5: 0 },
  { category: "PRE_PRODUCTION", lineNumber: 3, name: "Casting Fee", quantity: 0, days: 0, rate: 0, ot1_5: 0, ot2: 0, ot2_5: 0 },
  { category: "PRODUCTION", lineNumber: 4, name: "Key Grip", quantity: 0, days: 0, rate: 0, ot1_5: 0, ot2: 0, ot2_5: 0 },
  { category: "PRODUCTION", lineNumber: 5, name: "Camera Operator", quantity: 0, days: 0, rate: 0, ot1_5: 0, ot2: 0, ot2_5: 0 },
  { category: "PRODUCTION", lineNumber: 6, name: "Equipment Rentals", quantity: 0, days: 0, rate: 0, ot1_5: 0, ot2: 0, ot2_5: 0 },
  { category: "POST_PRODUCTION", lineNumber: 7, name: "Editor", quantity: 0, days: 0, rate: 0, ot1_5: 0, ot2: 0, ot2_5: 0 },
  { category: "POST_PRODUCTION", lineNumber: 8, name: "Color Grade", quantity: 0, days: 0, rate: 0, ot1_5: 0, ot2: 0, ot2_5: 0 },
  { category: "POST_PRODUCTION", lineNumber: 9, name: "Sound Mix", quantity: 0, days: 0, rate: 0, ot1_5: 0, ot2: 0, ot2_5: 0 },
];

function calculateEstimate(line: BudgetLine): number {
  const quantity = line.quantity || 1; // Default to 1 if blank/0
  const baseAmount = quantity * line.days * line.rate;
  const ot1_5Amount = line.ot1_5 * line.rate * 1.5;
  const ot2Amount = line.ot2 * line.rate * 2;
  const ot2_5Amount = line.ot2_5 * line.rate * 2.5;
  return baseAmount + ot1_5Amount + ot2Amount + ot2_5Amount;
}

export default function NewProjectPage() {
  const router = useRouter();
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>(
    defaultLines.map((line, i) => ({ ...line, id: `line-${i}` }))
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateLine = (id: string, field: keyof BudgetLine, value: string | number) => {
    setBudgetLines((lines) =>
      lines.map((line) => {
        if (line.id !== id) return line;

        // Handle name field as string, numeric fields as numbers
        if (field === "name") {
          return { ...line, [field]: value };
        } else {
          return { ...line, [field]: typeof value === "string" ? parseFloat(value) || 0 : value };
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
        quantity: 0,
        days: 0,
        rate: 0,
        ot1_5: 0,
        ot2: 0,
        ot2_5: 0,
      },
    ]);
  };

  const removeLine = (id: string) => {
    setBudgetLines((lines) => lines.filter((line) => line.id !== id));
  };

  const totalEstimate = budgetLines.reduce((sum, line) => sum + calculateEstimate(line), 0);

  const groupedLines = {
    PRE_PRODUCTION: budgetLines.filter((l) => l.category === "PRE_PRODUCTION"),
    PRODUCTION: budgetLines.filter((l) => l.category === "PRODUCTION"),
    POST_PRODUCTION: budgetLines.filter((l) => l.category === "POST_PRODUCTION"),
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectName.trim()) {
      setError("Project name is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createProject({
        name: projectName,
        clientName: clientName || "",
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
    } catch (err) {
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
          <div className="grid grid-cols-2 gap-4 mb-8">
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

          {/* Budget Breakdown */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Budget Breakdown</h2>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    addLine(e.target.value as BudgetLine["category"]);
                    e.target.value = ""; // Reset dropdown
                  }
                }}
                className="text-sm border border-gray-300 rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none bg-white bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22M6%208l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25em] bg-[right_0.5rem_center] bg-no-repeat"
              >
                <option value="">+ Add Line</option>
                <option value="PRE_PRODUCTION">Pre-Production</option>
                <option value="PRODUCTION">Production</option>
                <option value="POST_PRODUCTION">Post-Production</option>
              </select>
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
                    <th className="px-3 py-2 text-center font-semibold text-gray-700 w-20 border-r border-gray-300">1.5 OT</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-700 w-20 border-r border-gray-300">2 OT</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-700 w-20 border-r border-gray-300">2.5 OT</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-700 w-32 border-r border-gray-300">Estimate</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {(["PRE_PRODUCTION", "PRODUCTION", "POST_PRODUCTION"] as const).map((category, catIndex) => {
                    const categoryLabel = category.replace("_", "-").toLowerCase().split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
                    const lines = groupedLines[category];
                    const categoryLetter = String.fromCharCode(65 + catIndex); // A, B, C

                    return (
                      <React.Fragment key={category}>
                        {/* Category Header Row */}
                        <tr className="bg-gray-50 border-t border-gray-300">
                          <td className="px-3 py-2 font-semibold text-gray-700 border-r border-gray-300">{categoryLetter}</td>
                          <td colSpan={9} className="px-3 py-2 font-semibold text-gray-700">
                            {categoryLabel} Labor
                          </td>
                        </tr>

                        {/* Line Items */}
                        {lines.map((line, lineIndex) => (
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
                            <td className="px-3 py-2 text-right font-medium text-sm border-r border-gray-300">
                              ${calculateEstimate(line).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                      </React.Fragment>
                    );
                  })}
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
