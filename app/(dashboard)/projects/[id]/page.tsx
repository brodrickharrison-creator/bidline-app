"use client";

import { ArrowLeft, Share2, Check, X } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { getProjectById, assignBudgetLinePayee, updateRunningAmount } from "@/app/actions/projects";
import { getContacts } from "@/app/actions/contacts";
import { notFound, useParams, useSearchParams } from "next/navigation";

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

  // Group budget lines by category
  const groupedLines = {
    PRE_PRODUCTION: project.budgetLines.filter((l: any) => l.category === "PRE_PRODUCTION"),
    PRODUCTION: project.budgetLines.filter((l: any) => l.category === "PRODUCTION"),
    POST_PRODUCTION: project.budgetLines.filter((l: any) => l.category === "POST_PRODUCTION"),
  };

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
            <span className={`px-3 py-1 rounded-full text-sm font-medium uppercase ${
              project.status === "PLANNING"
                ? "bg-blue-100 text-blue-700"
                : project.status === "LIVE"
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-700"
            }`}>
              {project.status}
            </span>
          </div>
          {project.clientName && (
            <p className="text-gray-500">Client: {project.clientName}</p>
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
        <div className="border-b border-gray-200">
          <div className="flex gap-8 px-6">
            <Link
              href={`/projects/${params.id}?tab=estimate`}
              className={`py-4 border-b-2 transition-colors ${
                activeTab === "estimate"
                  ? "border-green-600 text-green-600 font-medium"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Estimate
            </Link>
            <Link
              href={`/projects/${params.id}?tab=running`}
              className={`py-4 border-b-2 transition-colors ${
                activeTab === "running"
                  ? "border-green-600 text-green-600 font-medium"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Running
            </Link>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "estimate" ? (
            <EstimateTab groupedLines={groupedLines} />
          ) : (
            <RunningTab
              groupedLines={groupedLines}
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

function EstimateTab({ groupedLines }: { groupedLines: any }) {
  const categories = [
    { key: "PRE_PRODUCTION", label: "Pre-Production Labor" },
    { key: "PRODUCTION", label: "Production Labor" },
    { key: "POST_PRODUCTION", label: "Post-Production Labor" },
  ];

  return (
    <div className="space-y-8">
      {categories.map((category) => {
        const lines = groupedLines[category.key as keyof typeof groupedLines];
        if (lines.length === 0) return null;

        return (
          <div key={category.key}>
            <h3 className="text-lg font-semibold text-gray-700 mb-3">{category.label}</h3>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">#</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Item</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">Days</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">Rate</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">1.5 OT</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">2 OT</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">2.5 OT</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-700">Estimate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {lines.map((line: any) => (
                    <tr key={line.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500">{line.lineNumber}</td>
                      <td className="px-4 py-3 font-medium">{line.name}</td>
                      <td className="px-4 py-3 text-center">{Number(line.days) || "-"}</td>
                      <td className="px-4 py-3 text-center">${Number(line.rate).toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">{Number(line.ot1_5) || "-"}</td>
                      <td className="px-4 py-3 text-center">{Number(line.ot2) || "-"}</td>
                      <td className="px-4 py-3 text-center">{Number(line.ot2_5) || "-"}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        ${Number(line.estimate).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RunningTab({
  groupedLines,
  invoices,
  contacts,
  onAssignPayee,
  onUpdateRunningAmount,
}: {
  groupedLines: any;
  invoices: any[];
  contacts: any[];
  onAssignPayee: (budgetLineId: string, payeeId: string | null) => Promise<void>;
  onUpdateRunningAmount: (budgetLineId: string, amount: number | null) => Promise<void>;
}) {
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editingRunningId, setEditingRunningId] = useState<string | null>(null);
  const [runningValue, setRunningValue] = useState<string>("");
  const [isSavingRunning, setIsSavingRunning] = useState(false);

  const categories = [
    { key: "PRE_PRODUCTION", label: "Pre-Production Labor" },
    { key: "PRODUCTION", label: "Production Labor" },
    { key: "POST_PRODUCTION", label: "Post-Production Labor" },
  ];

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
    <div className="space-y-8">
      {categories.map((category) => {
        const lines = groupedLines[category.key as keyof typeof groupedLines];
        if (lines.length === 0) return null;

        return (
          <div key={category.key}>
            <h3 className="text-lg font-semibold text-gray-700 mb-3">{category.label}</h3>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">#</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Item</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">Payee</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">Invoice Status</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">Running</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">Estimated</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">Actual</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-700">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {lines.map((line: any) => {
                    const lineInvoices = invoices.filter((inv) => inv.budgetLineId === line.id);
                    const hasInvoices = lineInvoices.length > 0;
                    const variance = Number(line.estimate) - Number(line.actualSpent);
                    const isEditing = editingLineId === line.id;

                    return (
                      <tr key={line.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500">{line.lineNumber}</td>
                        <td className="px-4 py-3 font-medium">{line.name}</td>
                        <td className="px-4 py-3 text-center">
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
                        <td className="px-4 py-3 text-center">
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
                        <td className="px-4 py-3 text-center">
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
                        <td className="px-4 py-3 text-center">
                          ${Number(line.estimate).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {Number(line.actualSpent) > 0 ? `$${Number(line.actualSpent).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "-"}
                        </td>
                        <td className={`px-4 py-3 text-right font-semibold ${variance >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {Number(line.actualSpent) > 0 ? `$${Math.abs(variance).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
