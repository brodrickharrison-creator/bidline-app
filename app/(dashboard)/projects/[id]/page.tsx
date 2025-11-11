"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Share2, Check, X, Plus, Download } from "lucide-react";
import Link from "next/link";
import { getProjectById, assignBudgetLinePayee, updateRunningAmount, updateBudgetLineFields, addBudgetLine } from "@/app/actions/projects";
import { getContacts } from "@/app/actions/contacts";
import { notFound, useParams, useSearchParams } from "next/navigation";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function ProjectDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [project, setProject] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const activeTab = searchParams.get("tab") || "estimate";

  useEffect(() => {
    loadData();
  }, [params.id]);

  const loadData = async () => {
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
  };

  const handleShareLink = async () => {
    const uploadUrl = `${window.location.origin}/upload`;

    try {
      await navigator.clipboard.writeText(uploadUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
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
    const pdfGroupedLines = project.budgetLines.reduce((acc: Record<string, any[]>, line: any) => {
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

      // Table data
      const tableData = lines.map((line: any) => [
        line.lineNumber,
        line.name,
        Number(line.quantity) || "-",
        Number(line.days) || "-",
        `$${Number(line.rate).toLocaleString()}`,
        Number(line.ot1_5) || "-",
        Number(line.ot2) || "-",
        Number(line.ot2_5) || "-",
        `$${Number(line.estimate).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [["#", "Item", "No", "Days", "Rate", "1.5 OT", "2 OT", "2.5 OT", "Estimate"]],
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
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 50 },
          2: { cellWidth: 15, halign: "center" },
          3: { cellWidth: 15, halign: "center" },
          4: { cellWidth: 20, halign: "right" },
          5: { cellWidth: 15, halign: "center" },
          6: { cellWidth: 15, halign: "center" },
          7: { cellWidth: 15, halign: "center" },
          8: { cellWidth: 30, halign: "right", fontStyle: "bold" },
        },
        margin: { left: 14 },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;
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

  const totalEstimate = project.budgetLines.reduce((sum: number, line: any) => sum + Number(line.estimate), 0);
  const totalActual = project.budgetLines.reduce((sum: number, line: any) => sum + Number(line.actualSpent), 0);
  const variance = totalEstimate - totalActual;

  // Group budget lines by category dynamically
  const groupedLines = project.budgetLines.reduce((acc: Record<string, any[]>, line: any) => {
    if (!acc[line.category]) {
      acc[line.category] = [];
    }
    acc[line.category].push(line);
    return acc;
  }, {});

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{project.name}</h1>
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
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Estimated Total</p>
          <p className="text-2xl font-bold">${totalEstimate.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Running Total</p>
          <p className="text-2xl font-bold">${totalActual.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Actuals Total</p>
          <p className="text-2xl font-bold">${Number(project.totalSpent).toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Variance</p>
          <p className={`text-2xl font-bold ${variance >= 0 ? "text-green-600" : "text-red-600"}`}>
            ${Math.abs(variance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200">
        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "estimate" ? (
            <EstimateTab
              projectId={params.id}
              activeTab={activeTab}
              groupedLines={groupedLines}
              categories={categories}
              totalEstimate={totalEstimate}
              onUpdateFields={async (budgetLineId, fields) => {
                await updateBudgetLineFields(budgetLineId, fields);
                loadData(); // Reload data to show updated fields
              }}
              onAddLine={async (category) => {
                await addBudgetLine(project.id, category);
                loadData(); // Reload data to show new line
              }}
              onExportBid={handleExportBid}
            />
          ) : (
            <RunningTab
              projectId={params.id}
              activeTab={activeTab}
              groupedLines={groupedLines}
              categories={categories}
              invoices={project.invoices}
              contacts={contacts}
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
    </div>
  );
}

function EstimateTab({
  projectId,
  activeTab,
  groupedLines,
  categories,
  totalEstimate,
  onUpdateFields,
  onAddLine,
  onExportBid,
}: {
  projectId: string;
  activeTab: string;
  groupedLines: any;
  categories: string[];
  totalEstimate: number;
  onUpdateFields: (budgetLineId: string, fields: any) => Promise<void>;
  onAddLine: (category: string) => Promise<void>;
  onExportBid: () => void;
}) {
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);

  // Helper function to check if a line has any filled data
  const hasFilledData = (line: any) => {
    return (
      line.quantity != null ||
      line.days != null ||
      line.rate != null ||
      line.ot1_5 != null ||
      line.ot2 != null ||
      line.ot2_5 != null
    );
  };

  const handleEditClick = (line: any) => {
    setEditingLineId(line.id);
    setEditValues({
      name: line.name || "New Line Item",
      quantity: line.quantity || 0,
      days: line.days || 0,
      rate: line.rate || 0,
      ot1_5: line.ot1_5 || 0,
      ot2: line.ot2 || 0,
      ot2_5: line.ot2_5 || 0,
    });
  };

  const handleSave = async (lineId: string) => {
    setIsSaving(true);
    await onUpdateFields(lineId, editValues);
    setIsSaving(false);
    setEditingLineId(null);
    setEditValues({});
  };

  const handleCancel = () => {
    setEditingLineId(null);
    setEditValues({});
  };

  const handleKeyDown = (e: React.KeyboardEvent, lineId: string) => {
    if (e.key === "Enter") {
      handleSave(lineId);
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const updateEditValue = (field: string, value: string) => {
    if (field === "name") {
      setEditValues({ ...editValues, [field]: value });
    } else {
      setEditValues({ ...editValues, [field]: parseFloat(value) || 0 });
    }
  };

  const calculateLiveEstimate = (values: any) => {
    const quantity = values.quantity || 1; // Default to 1 if blank/0
    const days = values.days || 0;
    const rate = values.rate || 0;
    const ot1_5 = values.ot1_5 || 0;
    const ot2 = values.ot2 || 0;
    const ot2_5 = values.ot2_5 || 0;

    return (quantity * days * rate) + (ot1_5 * rate * 1.5) + (ot2 * rate * 2) + (ot2_5 * rate * 2.5);
  };

  return (
    <div>
      {/* Tab Controls and Add Line */}
      <div className="mb-6 flex justify-between items-center">
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
          return lines.some((line: any) => hasFilledData(line));
        });

        if (!hasAnyFilledLines) {
          return (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No budget lines yet</h3>
              <p className="text-gray-500 mb-6">Start building your estimate by adding budget line items from the categories above</p>
              <p className="text-sm text-gray-400">Use the "+ Add Line" dropdown to add items to your budget</p>
            </div>
          );
        }

        return null;
      })()}

      {/* Unified Spreadsheet Table */}
      {categories.some((category) => {
        const lines = groupedLines[category] || [];
        return lines.some((line: any) => hasFilledData(line));
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
                <th className="px-3 py-2 text-center font-semibold text-gray-700 w-20 border-r border-gray-300">1.5 OT</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-700 w-20 border-r border-gray-300">2 OT</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-700 w-20 border-r border-gray-300">2.5 OT</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700 w-32 border-r border-gray-300">Estimate</th>
                <th className="px-3 py-2 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category, catIndex) => {
                const lines = groupedLines[category] || [];
                // Filter to only show lines with filled data
                const filledLines = lines.filter((line: any) => hasFilledData(line));
                // Don't show category if no filled lines
                if (filledLines.length === 0) return null;
                const categoryLetter = String.fromCharCode(65 + catIndex); // A, B, C

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
                    {filledLines.map((line: any) => {
                    const isEditing = editingLineId === line.id;
                    const displayEstimate = isEditing ? calculateLiveEstimate(editValues) : Number(line.estimate);

                    return (
                      <tr key={line.id} className="border-t border-gray-200 hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-500 text-center border-r border-gray-300">{line.lineNumber}</td>
                        <td className="px-3 py-2 border-r border-gray-300">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editValues.name || ""}
                              onChange={(e) => updateEditValue("name", e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, line.id)}
                              disabled={isSaving}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                            />
                          ) : (
                            <span className="font-medium">{line.name}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center border-r border-gray-300">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editValues.quantity || ""}
                              onChange={(e) => updateEditValue("quantity", e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, line.id)}
                              disabled={isSaving}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                              step="1"
                              min="0"
                            />
                          ) : (
                            <span>{Number(line.quantity) || "-"}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center border-r border-gray-300">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editValues.days || ""}
                              onChange={(e) => updateEditValue("days", e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, line.id)}
                              disabled={isSaving}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                              step="0.5"
                              min="0"
                            />
                          ) : (
                            <span>{Number(line.days) || "-"}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center border-r border-gray-300">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editValues.rate || ""}
                              onChange={(e) => updateEditValue("rate", e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, line.id)}
                              disabled={isSaving}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                              step="1"
                              min="0"
                            />
                          ) : (
                            <span>${Number(line.rate).toLocaleString()}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center border-r border-gray-300">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editValues.ot1_5 || ""}
                              onChange={(e) => updateEditValue("ot1_5", e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, line.id)}
                              disabled={isSaving}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                              step="0.5"
                              min="0"
                            />
                          ) : (
                            <span>{Number(line.ot1_5) || "-"}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center border-r border-gray-300">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editValues.ot2 || ""}
                              onChange={(e) => updateEditValue("ot2", e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, line.id)}
                              disabled={isSaving}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                              step="0.5"
                              min="0"
                            />
                          ) : (
                            <span>{Number(line.ot2) || "-"}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center border-r border-gray-300">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editValues.ot2_5 || ""}
                              onChange={(e) => updateEditValue("ot2_5", e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, line.id)}
                              disabled={isSaving}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                              step="0.5"
                              min="0"
                            />
                          ) : (
                            <span>{Number(line.ot2_5) || "-"}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold border-r border-gray-300">
                          ${displayEstimate.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleSave(line.id)}
                                disabled={isSaving}
                                className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                                title="Save"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={handleCancel}
                                disabled={isSaving}
                                className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleEditClick(line)}
                              className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                    })}
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
  groupedLines,
  categories,
  invoices,
  contacts,
  onAssignPayee,
  onUpdateRunningAmount,
}: {
  projectId: string;
  activeTab: string;
  groupedLines: any;
  categories: string[];
  invoices: any[];
  contacts: any[];
  onAssignPayee: (budgetLineId: string, payeeId: string | null) => Promise<void>;
  onUpdateRunningAmount: (budgetLineId: string, amount: number | null) => Promise<void>;
}) {
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editingRunningId, setEditingRunningId] = useState<string | null>(null);
  const [runningValue, setRunningValue] = useState<string>("");
  const [isSavingRunning, setIsSavingRunning] = useState(false);

  // Helper function to check if a line has any filled data
  const hasFilledData = (line: any) => {
    return (
      line.quantity != null ||
      line.days != null ||
      line.rate != null ||
      line.ot1_5 != null ||
      line.ot2 != null ||
      line.ot2_5 != null
    );
  };

  const handlePayeeChange = async (budgetLineId: string, payeeId: string) => {
    const finalPayeeId = payeeId === "" ? null : payeeId;
    await onAssignPayee(budgetLineId, finalPayeeId);
    setEditingLineId(null);
  };

  const handleRunningClick = (line: any) => {
    setEditingRunningId(line.id);
    setRunningValue(line.runningAmount ? String(line.runningAmount) : "");
  };

  const handleRunningChange = async (budgetLineId: string) => {
    const amount = runningValue === "" ? null : parseFloat(runningValue);
    if (runningValue !== "" && (isNaN(amount!) || amount! < 0)) {
      return; // Invalid input, don't save
    }

    setIsSavingRunning(true);
    await onUpdateRunningAmount(budgetLineId, amount);
    setIsSavingRunning(false);
    setEditingRunningId(null);
    setRunningValue("");
  };

  const handleCancelRunning = () => {
    setEditingRunningId(null);
    setRunningValue("");
  };

  const handleRunningKeyDown = (e: React.KeyboardEvent, budgetLineId: string) => {
    if (e.key === "Enter") {
      handleRunningChange(budgetLineId);
    } else if (e.key === "Escape") {
      handleCancelRunning();
    }
  };

  return (
    <div>
      {/* Tab Controls */}
      <div className="mb-6">
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
      </div>

      {/* Check if there are any filled lines across all categories */}
      {(() => {
        const hasAnyFilledLines = categories.some((category) => {
          const lines = groupedLines[category] || [];
          return lines.some((line: any) => hasFilledData(line));
        });

        if (!hasAnyFilledLines) {
          return (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-purple-600" />
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
        return lines.some((line: any) => hasFilledData(line));
      }) && (
        <div className="overflow-hidden border border-gray-300 rounded-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-100 border-b border-gray-300">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 w-12 border-r border-gray-300"></th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 border-r border-gray-300"></th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700 w-32 border-r border-gray-300">Payee</th>
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
                const filledLines = lines.filter((line: any) => hasFilledData(line));
                // Don't show category if no filled lines
                if (filledLines.length === 0) return null;
                const categoryLetter = String.fromCharCode(65 + catIndex); // A, B, C

                return (
                  <React.Fragment key={category}>
                    {/* Category Header Row */}
                    <tr className="bg-gray-50 border-t border-gray-300">
                      <td className="px-3 py-2 font-semibold text-gray-700 border-r border-gray-300">{categoryLetter}</td>
                      <td colSpan={7} className="px-3 py-2 font-semibold text-gray-700">
                        {category}
                      </td>
                    </tr>

                    {/* Line Items */}
                    {filledLines.map((line: any) => {
                    const lineInvoices = invoices.filter((inv) => inv.budgetLineId === line.id);
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
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                              Missing
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center border-r border-gray-300">
                          {editingRunningId === line.id ? (
                            <div className="flex items-center justify-center gap-2">
                              <input
                                type="number"
                                value={runningValue}
                                onChange={(e) => setRunningValue(e.target.value)}
                                onKeyDown={(e) => handleRunningKeyDown(e, line.id)}
                                autoFocus
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                disabled={isSavingRunning}
                                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                              />
                              <button
                                onClick={() => handleRunningChange(line.id)}
                                disabled={isSavingRunning}
                                className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                                title="Save"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={handleCancelRunning}
                                disabled={isSavingRunning}
                                className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleRunningClick(line)}
                              className="text-gray-700 hover:text-purple-600 hover:underline cursor-pointer"
                            >
                              {line.runningAmount ? `$${Number(line.runningAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "-"}
                            </button>
                          )}
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
