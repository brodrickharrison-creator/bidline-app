"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Share2, Check, Download, MoreVertical, Copy, Trash2 } from "lucide-react";
import Link from "next/link";
import { getProjectById, assignBudgetLinePayee, updateRunningAmount, updateBudgetLineFields, addBudgetLine, deleteBudgetLine, duplicateBudgetLine, updateProjectPercentages } from "@/app/actions/projects";
import { getContacts } from "@/app/actions/contacts";
import { createFringeRule, updateFringeRule, deleteFringeRule, assignFringeToLine } from "@/app/actions/fringe";
import { notFound, useParams, useSearchParams } from "next/navigation";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface FringeRuleData {
  id: string;
  name: string;
  percentage: number;
  projectId: string;
}

interface ProjectData {
  id: string;
  name: string;
  clientName: string | null;
  projectCode: string | null;
  ruleset: string;
  totalBudget: number;
  totalSpent: number;
  insurancePercent: number;
  productionFeePercent: number;
  budgetLines: BudgetLineData[];
  invoices: InvoiceData[];
  fringeRules: FringeRuleData[];
}

interface BudgetLineData {
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
  otHours: number | null;
  midnightHours: number | null;
  estimate: number;
  runningAmount: number | null;
  actualSpent: number;
  payeeId: string | null;
  payee: { id: string; name: string; email: string | null } | null;
  fringeRuleId: string | null;
  fringeRule: FringeRuleData | null;
}

interface InvoiceData {
  id: string;
  status: string;
  budgetLineId: string | null;
  amount: number;
}

interface ContactData {
  id: string;
  name: string;
  email: string | null;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [contacts, setContacts] = useState<ContactData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showFringeForm, setShowFringeForm] = useState(false);
  const [fringeName, setFringeName] = useState("");
  const [fringePercentage, setFringePercentage] = useState("");
  const [editingFringeId, setEditingFringeId] = useState<string | null>(null);

  const activeTab = searchParams.get("tab") || "estimate";

  const loadData = useCallback(async () => {
    const [projectData, contactsData] = await Promise.all([
      getProjectById(params.id as string),
      getContacts(),
    ]);

    if (!projectData) {
      notFound();
    }

    setProject(projectData);
    setContacts(contactsData);
    setIsLoading(false);
  }, [params.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleShareLink = async () => {
    const uploadUrl = `${window.location.origin}/upload`;

    try {
      await navigator.clipboard.writeText(uploadUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Failed to copy link. Please copy manually: " + uploadUrl);
    }
  };

  const handleExportBid = () => {
    if (!project) return;

    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Project Estimate", 14, 20);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Project: ${project.name}`, 14, 30);
    if (project.clientName) {
      doc.text(`Client: ${project.clientName}`, 14, 36);
    }
    if (project.projectCode) {
      const codeY = project.clientName ? 42 : 36;
      doc.text(`Project Code: ${project.projectCode}`, 14, codeY);
    }
    const preparedY = project.projectCode ? (project.clientName ? 48 : 42) : (project.clientName ? 42 : 36);
    doc.text(`Prepared by: BidLine`, 14, preparedY);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, preparedY + 6);

    let yPosition = preparedY + 16;

    // Group budget lines by category
    const pdfGroupedLines = project.budgetLines.reduce((acc: Record<string, BudgetLineData[]>, line: BudgetLineData) => {
      if (!acc[line.category]) {
        acc[line.category] = [];
      }
      acc[line.category].push(line);
      return acc;
    }, {});

    // Get categories sorted
    const pdfCategories = Object.keys(pdfGroupedLines).sort();

    pdfCategories.forEach((category) => {
      const lines = pdfGroupedLines[category];
      if (lines.length === 0) return;

      // Category heading
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(category, 14, yPosition);
      yPosition += 6;

      // Table data - conditional OT columns based on ruleset
      const tableData = lines.map((line: BudgetLineData) => {
        const baseData = [
          line.lineNumber,
          line.name,
          Number(line.quantity) || "-",
          Number(line.days) || "-",
          `$${Number(line.rate).toLocaleString()}`,
        ];

        if (project.ruleset === "FLAT_RATE") {
          return [
            ...baseData,
            Number(line.ot1_5) || "-",
            Number(line.ot2) || "-",
            Number(line.ot2_5) || "-",
            `$${Number(line.estimate).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          ];
        } else {
          return [
            ...baseData,
            Number(line.otHours) || "-",
            Number(line.midnightHours) || "-",
            `$${Number(line.estimate).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          ];
        }
      });

      // Conditional header based on ruleset
      const headerRow = project.ruleset === "FLAT_RATE"
        ? [["#", "Item", "No", "Days", "Rate", "1.5 OT", "2 OT", "2.5 OT", "Estimate"]]
        : [["#", "Item", "No", "Days", "Rate", "OT Hours", "Midnight Hours", "Estimate"]];

      // Conditional column styles based on ruleset
      const columnStyles = project.ruleset === "FLAT_RATE"
        ? {
            0: { cellWidth: 10, halign: "center" as const },
            1: { cellWidth: 50 },
            2: { cellWidth: 15, halign: "center" as const },
            3: { cellWidth: 15, halign: "center" as const },
            4: { cellWidth: 20, halign: "right" as const },
            5: { cellWidth: 15, halign: "center" as const },
            6: { cellWidth: 15, halign: "center" as const },
            7: { cellWidth: 15, halign: "center" as const },
            8: { cellWidth: 30, halign: "right" as const, fontStyle: "bold" },
          }
        : {
            0: { cellWidth: 10, halign: "center" as const },
            1: { cellWidth: 50 },
            2: { cellWidth: 15, halign: "center" as const },
            3: { cellWidth: 15, halign: "center" as const },
            4: { cellWidth: 20, halign: "right" as const },
            5: { cellWidth: 20, halign: "center" as const },
            6: { cellWidth: 25, halign: "center" as const },
            7: { cellWidth: 30, halign: "right" as const, fontStyle: "bold" },
          };

      autoTable(doc, {
        startY: yPosition,
        head: headerRow,
        body: tableData,
        theme: "grid",
        headStyles: {
          fillColor: [34, 197, 94], // green-600
          textColor: 255,
          fontStyle: "bold",
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 9,
        },
        columnStyles,
        margin: { left: 14 },
      });

      yPosition = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    });

    // Total
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    const totalText = `Estimated Total: $${totalEstimate.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    doc.text(totalText, 14, yPosition);

    // Save PDF
    const fileName = `${project.name.replace(/[^a-z0-9]/gi, '_')}_Estimate.pdf`;
    doc.save(fileName);
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Loading project...</p>
      </div>
    );
  }

  if (!project) {
    notFound();
  }

  const lineItemsSubtotal = project.budgetLines.reduce((sum: number, line: BudgetLineData) => sum + Number(line.estimate), 0);
  const insuranceAmount = lineItemsSubtotal * (project.insurancePercent / 100);
  const productionFeeAmount = lineItemsSubtotal * (project.productionFeePercent / 100);
  const totalEstimate = lineItemsSubtotal + insuranceAmount + productionFeeAmount;
  const totalActual = project.budgetLines.reduce((sum: number, line: BudgetLineData) => sum + Number(line.actualSpent), 0);
  const variance = totalEstimate - totalActual;

  // Group budget lines by category dynamically
  const groupedLines = project.budgetLines.reduce((acc: Record<string, BudgetLineData[]>, line: BudgetLineData) => {
    if (!acc[line.category]) {
      acc[line.category] = [];
    }
    acc[line.category].push(line);
    return acc;
  }, {} as Record<string, BudgetLineData[]>);

  // Get unique categories for iteration
  const categories = Object.keys(groupedLines).sort();

  return (
    <div className="p-8">
      {/* Header */}
      <Link href="/projects" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Projects
      </Link>

      <div className="flex justify-between items-start mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
              project.ruleset === "APA"
                ? "bg-purple-100 text-purple-700"
                : "bg-blue-100 text-blue-700"
            }`}>
              {project.ruleset === "APA" ? "APA Ruleset" : "Flat Rate"}
            </span>
          </div>
          {project.clientName && (
            <p className="text-gray-500">Client: {project.clientName}</p>
          )}
          {project.projectCode && (
            <p className="text-gray-500">Project Code: {project.projectCode}</p>
          )}
        </div>
        <button
          onClick={handleShareLink}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-green-600">Link Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4" />
              Share Invoice Upload Link
            </>
          )}
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-6 gap-6 mb-8">
        {/* Grand Total */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Grand Total</p>
          <p className="text-2xl font-bold text-green-600">${totalEstimate.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
        </div>

        {/* Insurance & Production Fee */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-3">Fees & Insurance</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-500">Insurance:</span>
              {activeTab === "estimate" ? (
                <input
                  type="number"
                  value={project.insurancePercent}
                  onChange={async (e) => {
                    const value = parseFloat(e.target.value) || 0;
                    if (value >= 0 && value <= 100) {
                      await updateProjectPercentages(project.id, value, project.productionFeePercent);
                      loadData();
                    }
                  }}
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-xs text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                  step="0.01"
                  min="0"
                  max="100"
                />
              ) : (
                <span className="text-xs font-medium">{project.insurancePercent}%</span>
              )}
              <span className="text-xs font-semibold">${insuranceAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-500">Prod Fee:</span>
              {activeTab === "estimate" ? (
                <input
                  type="number"
                  value={project.productionFeePercent}
                  onChange={async (e) => {
                    const value = parseFloat(e.target.value) || 0;
                    if (value >= 0 && value <= 100) {
                      await updateProjectPercentages(project.id, project.insurancePercent, value);
                      loadData();
                    }
                  }}
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-xs text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                  step="0.01"
                  min="0"
                  max="100"
                />
              ) : (
                <span className="text-xs font-medium">{project.productionFeePercent}%</span>
              )}
              <span className="text-xs font-semibold">${productionFeeAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Fringe Rules */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-600">Fringe Rules</p>
            {activeTab === "estimate" && (
              <button
                onClick={() => {
                  setShowFringeForm(true);
                  setEditingFringeId(null);
                  setFringeName("");
                  setFringePercentage("");
                }}
                className="text-xs text-green-600 hover:text-green-700"
              >
                + Add
              </button>
            )}
          </div>
          <div className="space-y-2">
            {project.fringeRules.length === 0 ? (
              <p className="text-xs text-gray-400">No fringe rules</p>
            ) : (
              project.fringeRules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-600">{rule.name}:</span>
                  <span className="text-xs font-medium">{rule.percentage}%</span>
                  {activeTab === "estimate" && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditingFringeId(rule.id);
                          setFringeName(rule.name);
                          setFringePercentage(rule.percentage.toString());
                          setShowFringeForm(true);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(`Delete fringe rule "${rule.name}"?`)) {
                            await deleteFringeRule(rule.id);
                            loadData();
                          }
                        }}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Running Total */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Running Total</p>
          <p className="text-2xl font-bold">${totalActual.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
        </div>

        {/* Variance */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Variance</p>
          <p className={`text-2xl font-bold ${variance >= 0 ? "text-green-600" : "text-red-600"}`}>
            ${Math.abs(variance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Actuals Total */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Actuals Total</p>
          <p className="text-2xl font-bold">${Number(project.totalSpent).toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200">
        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "estimate" ? (
            <EstimateTab
              projectId={params.id as string}
              activeTab={activeTab}
              project={project}
              groupedLines={groupedLines}
              categories={categories}
              insurancePercent={project.insurancePercent}
              productionFeePercent={project.productionFeePercent}
              lineItemsSubtotal={lineItemsSubtotal}
              insuranceAmount={insuranceAmount}
              productionFeeAmount={productionFeeAmount}
              totalEstimate={totalEstimate}
              onUpdateFields={async (budgetLineId, fields) => {
                await updateBudgetLineFields(budgetLineId, fields);
                loadData(); // Reload data to show updated fields
              }}
              onUpdatePercentages={async (insurancePercent, productionFeePercent) => {
                await updateProjectPercentages(project.id, insurancePercent, productionFeePercent);
                loadData(); // Reload data to show updated percentages
              }}
              onAddLine={async (category) => {
                await addBudgetLine(project.id, category);
                loadData(); // Reload data to show new line
              }}
              onAssignFringe={async (budgetLineId, fringeRuleId) => {
                await assignFringeToLine(budgetLineId, fringeRuleId);
                loadData(); // Reload data to show updated fringe
              }}
              onExportBid={handleExportBid}
            />
          ) : (
            <RunningTab
              projectId={params.id as string}
              activeTab={activeTab}
              project={project}
              groupedLines={groupedLines}
              categories={categories}
              invoices={project.invoices}
              contacts={contacts}
              projectCode={project.projectCode}
              insurancePercent={project.insurancePercent}
              productionFeePercent={project.productionFeePercent}
              lineItemsSubtotal={lineItemsSubtotal}
              insuranceAmount={insuranceAmount}
              productionFeeAmount={productionFeeAmount}
              totalEstimate={totalEstimate}
              onAssignPayee={async (budgetLineId, payeeId) => {
                await assignBudgetLinePayee(budgetLineId, payeeId);
                loadData(); // Reload data to show updated payee
              }}
              onUpdateRunningAmount={async (budgetLineId, amount) => {
                await updateRunningAmount(budgetLineId, amount);
                loadData(); // Reload data to show updated running amount
              }}
            />
          )}
        </div>
      </div>

      {/* Fringe Form Modal */}
      {showFringeForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingFringeId ? "Edit" : "Add"} Fringe Rule
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={fringeName}
                  onChange={(e) => setFringeName(e.target.value)}
                  placeholder="e.g., Fringe A"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Percentage (%)
                </label>
                <input
                  type="number"
                  value={fringePercentage}
                  onChange={(e) => setFringePercentage(e.target.value)}
                  placeholder="e.g., 15.5"
                  step="0.01"
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setShowFringeForm(false);
                  setEditingFringeId(null);
                  setFringeName("");
                  setFringePercentage("");
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const percentage = parseFloat(fringePercentage);
                  if (!fringeName || isNaN(percentage)) {
                    alert("Please enter a valid name and percentage");
                    return;
                  }

                  if (editingFringeId) {
                    await updateFringeRule(editingFringeId, fringeName, percentage);
                  } else {
                    await createFringeRule(project.id, fringeName, percentage);
                  }

                  setShowFringeForm(false);
                  setEditingFringeId(null);
                  setFringeName("");
                  setFringePercentage("");
                  loadData();
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                {editingFringeId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EstimateTab({
  projectId,
  activeTab,
  project,
  groupedLines,
  categories,
  insurancePercent,
  productionFeePercent,
  lineItemsSubtotal,
  insuranceAmount,
  productionFeeAmount,
  totalEstimate,
  onUpdateFields,
  onUpdatePercentages,
  onAddLine,
  onAssignFringe,
  onExportBid,
}: {
  projectId: string;
  activeTab: string;
  project: ProjectData;
  groupedLines: Record<string, BudgetLineData[]>;
  categories: string[];
  insurancePercent: number;
  productionFeePercent: number;
  lineItemsSubtotal: number;
  insuranceAmount: number;
  productionFeeAmount: number;
  totalEstimate: number;
  onUpdateFields: (budgetLineId: string, fields: Record<string, unknown>) => Promise<void>;
  onUpdatePercentages: (insurancePercent: number, productionFeePercent: number) => Promise<void>;
  onAddLine: (category: string) => Promise<void>;
  onAssignFringe: (budgetLineId: string, fringeRuleId: string | null) => Promise<void>;
  onExportBid: () => void;
}) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [localValues, setLocalValues] = useState<Record<string, Record<string, unknown>>>({});

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [openMenuId]);

  // Helper function to check if a line has any filled data
  const hasFilledData = (line: BudgetLineData) => {
    return (
      line.quantity != null ||
      line.days != null ||
      line.rate != null ||
      line.ot1_5 != null ||
      line.ot2 != null ||
      line.ot2_5 != null ||
      line.otHours != null ||
      line.midnightHours != null
    );
  };

  // Get current value for a field (local or from line data)
  const getFieldValue = (lineId: string, field: string, line: BudgetLineData): string => {
    if (localValues[lineId] && localValues[lineId][field] !== undefined) {
      return String(localValues[lineId][field]);
    }
    const value = (line as unknown as Record<string, unknown>)[field];
    if (value === null || value === undefined) return "";
    return String(value);
  };

  // Handle field change (update local state)
  const handleFieldChange = (lineId: string, field: string, value: string) => {
    setLocalValues((prev) => ({
      ...prev,
      [lineId]: {
        ...prev[lineId],
        [field]: field === "name" ? value : (value === "" ? 0 : parseFloat(value) || 0),
      },
    }));
  };

  // Handle field blur (save to server)
  const handleFieldBlur = async (lineId: string, field: string) => {
    if (localValues[lineId] && localValues[lineId][field] !== undefined) {
      await onUpdateFields(lineId, { [field]: localValues[lineId][field] });
      // Clear local state after save
      setLocalValues((prev) => {
        const newValues = { ...prev };
        if (newValues[lineId]) {
          delete newValues[lineId][field];
          if (Object.keys(newValues[lineId]).length === 0) {
            delete newValues[lineId];
          }
        }
        return newValues;
      });
    }
  };

  // Handle duplicate
  const handleDuplicate = async (lineId: string) => {
    setOpenMenuId(null);
    await duplicateBudgetLine(lineId);
  };

  // Handle delete
  const handleDelete = async (lineId: string) => {
    setOpenMenuId(null);
    await deleteBudgetLine(lineId);
  };

  return (
    <div>
      {/* Tab Controls and Add Line */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="inline-flex bg-gray-100 rounded-lg p-1">
            <Link
              href={`/projects/${projectId}?tab=estimate`}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === "estimate"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Estimate
            </Link>
            <Link
              href={`/projects/${projectId}?tab=running`}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === "running"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Running
            </Link>
          </div>
          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
            project.ruleset === "APA"
              ? "bg-purple-100 text-purple-700"
              : "bg-blue-100 text-blue-700"
          }`}>
            {project.ruleset === "APA" ? "APA Rules Applied" : "Flat Rate Rules Applied"}
          </span>
        </div>
        <select
          onChange={(e) => {
            if (e.target.value) {
              onAddLine(e.target.value);
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

      {/* Check if there are any filled lines across all categories */}
      {(() => {
        const hasAnyFilledLines = categories.some((category) => {
          const lines = groupedLines[category] || [];
          return lines.some((line: BudgetLineData) => hasFilledData(line));
        });

        if (!hasAnyFilledLines) {
          return (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Download className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No budget lines yet</h3>
              <p className="text-gray-500 mb-6">Start building your estimate by adding budget line items from the categories above</p>
              <p className="text-sm text-gray-400">Use the &quot;+ Add Line&quot; dropdown to add items to your budget</p>
            </div>
          );
        }

        return null;
      })()}

      {/* Unified Spreadsheet Table */}
      {categories.some((category) => {
        const lines = groupedLines[category] || [];
        return lines.some((line: BudgetLineData) => hasFilledData(line));
      }) && (
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
                {project.ruleset === "FLAT_RATE" ? (
                  <>
                    <th className="px-3 py-2 text-center font-semibold text-gray-700 w-20 border-r border-gray-300">1.5 OT</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-700 w-20 border-r border-gray-300">2 OT</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-700 w-20 border-r border-gray-300">2.5 OT</th>
                  </>
                ) : (
                  <>
                    <th className="px-3 py-2 text-center font-semibold text-gray-700 w-24 border-r border-gray-300">OT Hours</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-700 w-28 border-r border-gray-300">Midnight Hours</th>
                  </>
                )}
                <th className="px-3 py-2 text-right font-semibold text-gray-700 w-32 border-r border-gray-300">Estimate</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 w-32 border-r border-gray-300">Fringe</th>
                <th className="px-3 py-2 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category, catIndex) => {
                const lines = groupedLines[category] || [];
                // Filter to only show lines with filled data
                const filledLines = lines.filter((line: BudgetLineData) => hasFilledData(line));
                // Don't show category if no filled lines
                if (filledLines.length === 0) return null;
                const categoryLetter = String.fromCharCode(65 + catIndex); // A, B, C

                // Calculate category subtotal
                const categorySubtotal = filledLines.reduce((sum, line) => {
                  return sum + Number(line.estimate);
                }, 0);

                return (
                  <React.Fragment key={category}>
                    {/* Category Header Row */}
                    <tr className="bg-gray-50 border-t border-gray-300">
                      <td className="px-3 py-2 font-semibold text-gray-700 border-r border-gray-300">{categoryLetter}</td>
                      <td colSpan={10} className="px-3 py-2 font-semibold text-gray-700">
                        {category}
                      </td>
                    </tr>

                    {/* Line Items */}
                    {filledLines.map((line: BudgetLineData) => {
                    return (
                      <tr key={line.id} className="border-t border-gray-200 hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-500 text-center border-r border-gray-300">{line.lineNumber}</td>
                        <td className="px-3 py-2 border-r border-gray-300">
                          <input
                            type="text"
                            value={getFieldValue(line.id, "name", line)}
                            onChange={(e) => handleFieldChange(line.id, "name", e.target.value)}
                            onBlur={() => handleFieldBlur(line.id, "name")}
                            className="w-full px-2 py-1 border border-transparent hover:border-gray-300 rounded text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 font-medium"
                          />
                        </td>
                        <td className="px-3 py-2 text-center border-r border-gray-300">
                          <input
                            type="number"
                            value={getFieldValue(line.id, "quantity", line)}
                            onChange={(e) => handleFieldChange(line.id, "quantity", e.target.value)}
                            onBlur={() => handleFieldBlur(line.id, "quantity")}
                            className="w-16 px-2 py-1 border border-transparent hover:border-gray-300 rounded text-sm text-center focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                            step="1"
                            min="0"
                          />
                        </td>
                        <td className="px-3 py-2 text-center border-r border-gray-300">
                          <input
                            type="number"
                            value={getFieldValue(line.id, "days", line)}
                            onChange={(e) => handleFieldChange(line.id, "days", e.target.value)}
                            onBlur={() => handleFieldBlur(line.id, "days")}
                            className="w-16 px-2 py-1 border border-transparent hover:border-gray-300 rounded text-sm text-center focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                            step="0.5"
                            min="0"
                          />
                        </td>
                        <td className="px-3 py-2 text-center border-r border-gray-300">
                          <input
                            type="number"
                            value={getFieldValue(line.id, "rate", line)}
                            onChange={(e) => handleFieldChange(line.id, "rate", e.target.value)}
                            onBlur={() => handleFieldBlur(line.id, "rate")}
                            className="w-20 px-2 py-1 border border-transparent hover:border-gray-300 rounded text-sm text-center focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                            step="1"
                            min="0"
                          />
                        </td>
                        {project.ruleset === "FLAT_RATE" ? (
                          <>
                            <td className="px-3 py-2 text-center border-r border-gray-300">
                              <input
                                type="number"
                                value={getFieldValue(line.id, "ot1_5", line)}
                                onChange={(e) => handleFieldChange(line.id, "ot1_5", e.target.value)}
                                onBlur={() => handleFieldBlur(line.id, "ot1_5")}
                                className="w-16 px-2 py-1 border border-transparent hover:border-gray-300 rounded text-sm text-center focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                                step="0.5"
                                min="0"
                              />
                            </td>
                            <td className="px-3 py-2 text-center border-r border-gray-300">
                              <input
                                type="number"
                                value={getFieldValue(line.id, "ot2", line)}
                                onChange={(e) => handleFieldChange(line.id, "ot2", e.target.value)}
                                onBlur={() => handleFieldBlur(line.id, "ot2")}
                                className="w-16 px-2 py-1 border border-transparent hover:border-gray-300 rounded text-sm text-center focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                                step="0.5"
                                min="0"
                              />
                            </td>
                            <td className="px-3 py-2 text-center border-r border-gray-300">
                              <input
                                type="number"
                                value={getFieldValue(line.id, "ot2_5", line)}
                                onChange={(e) => handleFieldChange(line.id, "ot2_5", e.target.value)}
                                onBlur={() => handleFieldBlur(line.id, "ot2_5")}
                                className="w-16 px-2 py-1 border border-transparent hover:border-gray-300 rounded text-sm text-center focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                                step="0.5"
                                min="0"
                              />
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-2 text-center border-r border-gray-300">
                              <input
                                type="number"
                                value={getFieldValue(line.id, "otHours", line)}
                                onChange={(e) => handleFieldChange(line.id, "otHours", e.target.value)}
                                onBlur={() => handleFieldBlur(line.id, "otHours")}
                                className="w-20 px-2 py-1 border border-transparent hover:border-gray-300 rounded text-sm text-center focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                                step="0.5"
                                min="0"
                              />
                            </td>
                            <td className="px-3 py-2 text-center border-r border-gray-300">
                              <input
                                type="number"
                                value={getFieldValue(line.id, "midnightHours", line)}
                                onChange={(e) => handleFieldChange(line.id, "midnightHours", e.target.value)}
                                onBlur={() => handleFieldBlur(line.id, "midnightHours")}
                                className="w-24 px-2 py-1 border border-transparent hover:border-gray-300 rounded text-sm text-center focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                                step="0.5"
                                min="0"
                              />
                            </td>
                          </>
                        )}
                        <td className="px-3 py-2 text-right font-semibold border-r border-gray-300">
                          ${Number(line.estimate).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2 text-xs border-r border-gray-300">
                          <select
                            value={line.fringeRuleId || ""}
                            onChange={async (e) => {
                              const fringeRuleId = e.target.value || null;
                              await onAssignFringe(line.id, fringeRuleId);
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                            <option value="">None</option>
                            {project.fringeRules.map((rule) => (
                              <option key={rule.id} value={rule.id}>
                                {rule.name} ({rule.percentage}%)
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === line.id ? null : line.id);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {/* Dropdown Menu */}
                          {openMenuId === line.id && (
                            <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                              <button
                                onClick={() => handleDuplicate(line.id)}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Copy className="w-4 h-4" />
                                Duplicate
                              </button>
                              <button
                                onClick={() => handleDelete(line.id)}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                    })}

                    {/* Category Subtotal Row */}
                    <tr className="bg-gray-100 border-t-2 border-gray-400">
                      <td className="px-3 py-2 border-r border-gray-300"></td>
                      <td colSpan={project.ruleset === "FLAT_RATE" ? 6 : 6} className="px-3 py-2 text-right font-semibold text-gray-700">
                        Subtotal:
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-gray-900 border-r border-gray-300">
                        ${categorySubtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2 border-r border-gray-300"></td>
                      <td className="px-3 py-2"></td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}

    {/* Export Bid Button */}
    <div className="mt-6 flex justify-end">
      <button
        onClick={onExportBid}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
      >
        <Download className="w-4 h-4" />
        Export Bid PDF
      </button>
    </div>
  </div>
  );
}

function RunningTab({
  projectId,
  activeTab,
  project,
  groupedLines,
  categories,
  invoices,
  contacts,
  projectCode,
  insurancePercent,
  productionFeePercent,
  lineItemsSubtotal,
  insuranceAmount,
  productionFeeAmount,
  totalEstimate,
  onAssignPayee,
  onUpdateRunningAmount,
}: {
  projectId: string;
  activeTab: string;
  project: ProjectData;
  groupedLines: Record<string, BudgetLineData[]>;
  categories: string[];
  invoices: InvoiceData[];
  contacts: ContactData[];
  projectCode: string | null;
  insurancePercent: number;
  productionFeePercent: number;
  lineItemsSubtotal: number;
  insuranceAmount: number;
  productionFeeAmount: number;
  totalEstimate: number;
  onAssignPayee: (budgetLineId: string, payeeId: string | null) => Promise<void>;
  onUpdateRunningAmount: (budgetLineId: string, amount: number | null) => Promise<void>;
}) {
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [localRunningValues, setLocalRunningValues] = useState<Record<string, string>>({});

  // Helper function to check if a line has any filled data
  const hasFilledData = (line: BudgetLineData) => {
    return (
      line.quantity != null ||
      line.days != null ||
      line.rate != null ||
      line.ot1_5 != null ||
      line.ot2 != null ||
      line.ot2_5 != null ||
      line.otHours != null ||
      line.midnightHours != null
    );
  };

  const handlePayeeChange = async (budgetLineId: string, payeeId: string) => {
    const finalPayeeId = payeeId === "" ? null : payeeId;
    await onAssignPayee(budgetLineId, finalPayeeId);
    setEditingLineId(null);
  };

  // Get current value for running field (local or from line data)
  const getRunningValue = (lineId: string, line: BudgetLineData): string => {
    if (localRunningValues[lineId] !== undefined) {
      return localRunningValues[lineId];
    }
    return line.runningAmount ? String(line.runningAmount) : "";
  };

  // Handle running field change (update local state)
  const handleRunningChange = (lineId: string, value: string) => {
    setLocalRunningValues((prev) => ({
      ...prev,
      [lineId]: value,
    }));
  };

  // Handle running field blur (save to server)
  const handleRunningBlur = async (lineId: string) => {
    if (localRunningValues[lineId] !== undefined) {
      const value = localRunningValues[lineId];
      const amount = value === "" ? null : parseFloat(value);

      // Only save if valid
      if (value !== "" && amount !== null && (isNaN(amount) || amount < 0)) {
        // Invalid input - revert to original
        setLocalRunningValues((prev) => {
          const newValues = { ...prev };
          delete newValues[lineId];
          return newValues;
        });
        return;
      }

      await onUpdateRunningAmount(lineId, amount);

      // Clear local state after save
      setLocalRunningValues((prev) => {
        const newValues = { ...prev };
        delete newValues[lineId];
        return newValues;
      });
    }
  };

  return (
    <div>
      {/* Tab Controls */}
      <div className="mb-6 flex items-center gap-3">
        <div className="inline-flex bg-gray-100 rounded-lg p-1">
          <Link
            href={`/projects/${projectId}?tab=estimate`}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "estimate"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Estimate
          </Link>
          <Link
            href={`/projects/${projectId}?tab=running`}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "running"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Running
          </Link>
        </div>
        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
          project.ruleset === "APA"
            ? "bg-purple-100 text-purple-700"
            : "bg-blue-100 text-blue-700"
        }`}>
          {project.ruleset === "APA" ? "APA Rules Applied" : "Flat Rate Rules Applied"}
        </span>
      </div>

      {/* Check if there are any filled lines across all categories */}
      {(() => {
        const hasAnyFilledLines = categories.some((category) => {
          const lines = groupedLines[category] || [];
          return lines.some((line: BudgetLineData) => hasFilledData(line));
        });

        if (!hasAnyFilledLines) {
          return (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Download className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No budget lines yet</h3>
              <p className="text-gray-500 mb-6">Switch to the Estimate tab to start building your budget</p>
              <Link
                href={`/projects/${projectId}?tab=estimate`}
                className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
              >
                Go to Estimate
              </Link>
            </div>
          );
        }

        return null;
      })()}

      {/* Unified Spreadsheet Table */}
      {categories.some((category) => {
        const lines = groupedLines[category] || [];
        return lines.some((line: BudgetLineData) => hasFilledData(line));
      }) && (
        <div className="overflow-hidden border border-gray-300 rounded-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-100 border-b border-gray-300">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 w-12 border-r border-gray-300"></th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 border-r border-gray-300"></th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700 w-32 border-r border-gray-300">Payee</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 w-32 border-r border-gray-300">Fringe</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-700 w-32 border-r border-gray-300">Invoice Status</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-700 w-28 border-r border-gray-300">Running</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-700 w-28 border-r border-gray-300">Estimated</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-700 w-28 border-r border-gray-300">Actual</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700 w-28">Variance</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category, catIndex) => {
                const lines = groupedLines[category] || [];
                // Filter to only show lines with filled data
                const filledLines = lines.filter((line: BudgetLineData) => hasFilledData(line));
                // Don't show category if no filled lines
                if (filledLines.length === 0) return null;
                const categoryLetter = String.fromCharCode(65 + catIndex); // A, B, C

                // Calculate category subtotals
                const categoryEstimateSubtotal = filledLines.reduce((sum, line) => {
                  return sum + Number(line.estimate);
                }, 0);
                const categoryActualSubtotal = filledLines.reduce((sum, line) => {
                  return sum + Number(line.actualSpent);
                }, 0);
                const categoryVarianceSubtotal = categoryEstimateSubtotal - categoryActualSubtotal;

                return (
                  <React.Fragment key={category}>
                    {/* Category Header Row */}
                    <tr className="bg-gray-50 border-t border-gray-300">
                      <td className="px-3 py-2 font-semibold text-gray-700 border-r border-gray-300">{categoryLetter}</td>
                      <td colSpan={8} className="px-3 py-2 font-semibold text-gray-700">
                        {category}
                      </td>
                    </tr>

                    {/* Line Items */}
                    {filledLines.map((line: BudgetLineData) => {
                    const lineInvoices = invoices.filter((inv: InvoiceData) => inv.budgetLineId === line.id);
                    const hasInvoices = lineInvoices.length > 0;
                    const variance = Number(line.estimate) - Number(line.actualSpent);
                    const isEditing = editingLineId === line.id;

                    return (
                      <tr key={line.id} className="border-t border-gray-200 hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-500 text-center border-r border-gray-300">{line.lineNumber}</td>
                        <td className="px-3 py-2 font-medium border-r border-gray-300">{line.name}</td>
                        <td className="px-3 py-2 text-center border-r border-gray-300">
                          {isEditing ? (
                            <select
                              value={line.payeeId || ""}
                              onChange={(e) => handlePayeeChange(line.id, e.target.value)}
                              onBlur={() => setEditingLineId(null)}
                              autoFocus
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                              <option value="">Not assigned</option>
                              {contacts.map((contact) => (
                                <option key={contact.id} value={contact.id}>
                                  {contact.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <button
                              onClick={() => setEditingLineId(line.id)}
                              className="text-gray-700 hover:text-green-600 hover:underline cursor-pointer"
                            >
                              {line.payee?.name || "-"}
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs border-r border-gray-300">
                          <span className="text-gray-900">
                            {line.fringeRule ? `${line.fringeRule.name} (${line.fringeRule.percentage}%)` : "-"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center border-r border-gray-300">
                          {hasInvoices ? (
                            <Link
                              href={`/invoices/${lineInvoices[0].id}`}
                              className={`inline-block px-2 py-1 text-xs rounded hover:opacity-80 cursor-pointer transition-all ${
                                lineInvoices[0].status === "PAID"
                                  ? "bg-green-100 text-green-700"
                                  : lineInvoices[0].status === "APPROVED"
                                  ? "bg-blue-100 text-blue-700"
                                  : lineInvoices[0].status === "FLAGGED"
                                  ? "bg-red-100 text-red-700"
                                  : lineInvoices[0].status === "MISSING"
                                  ? "bg-gray-100 text-gray-700"
                                  : "bg-orange-100 text-orange-700"
                              }`}
                            >
                              {lineInvoices[0].status.toLowerCase().replace("_", " ")}
                            </Link>
                          ) : (
                            <Link
                              href={`/upload?projectCode=${projectCode || ""}&payeeEmail=${line.payee?.email || ""}&lineItemId=${line.id}`}
                              className="inline-block px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded hover:bg-orange-200 cursor-pointer transition-all"
                            >
                              Missing - Upload
                            </Link>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center border-r border-gray-300">
                          <input
                            type="number"
                            value={getRunningValue(line.id, line)}
                            onChange={(e) => handleRunningChange(line.id, e.target.value)}
                            onBlur={() => handleRunningBlur(line.id)}
                            className="w-24 px-2 py-1 border border-transparent hover:border-gray-300 rounded text-sm text-center focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="px-3 py-2 text-center border-r border-gray-300">
                          ${Number(line.estimate).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2 text-center border-r border-gray-300">
                          {Number(line.actualSpent) > 0 ? `$${Number(line.actualSpent).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "-"}
                        </td>
                        <td className={`px-3 py-2 text-right font-semibold ${variance >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {Number(line.actualSpent) > 0 ? `$${Math.abs(variance).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "-"}
                        </td>
                      </tr>
                    );
                    })}

                    {/* Category Subtotal Row */}
                    <tr className="bg-gray-100 border-t-2 border-gray-400">
                      <td className="px-3 py-2 border-r border-gray-300"></td>
                      <td colSpan={4} className="px-3 py-2 text-right font-semibold text-gray-700">
                        Subtotal:
                      </td>
                      <td className="px-3 py-2 border-r border-gray-300"></td>
                      <td className="px-3 py-2 text-center font-bold text-gray-900 border-r border-gray-300">
                        ${categoryEstimateSubtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-gray-900 border-r border-gray-300">
                        {categoryActualSubtotal > 0 ? `$${categoryActualSubtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-"}
                      </td>
                      <td className={`px-3 py-2 text-right font-bold ${categoryVarianceSubtotal >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {categoryActualSubtotal > 0 ? `$${Math.abs(categoryVarianceSubtotal).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-"}
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
