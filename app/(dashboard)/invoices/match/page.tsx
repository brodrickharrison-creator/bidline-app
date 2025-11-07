"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, AlertCircle, Check } from "lucide-react";
import Link from "next/link";
import { getUnmatchedInvoices, getSuggestedLineItems, assignInvoiceToLineItem } from "@/app/actions/invoices";

export default function MatchInvoicesPage() {
  const [unmatchedInvoices, setUnmatchedInvoices] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [suggestedLines, setSuggestedLines] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    loadUnmatchedInvoices();
  }, []);

  const loadUnmatchedInvoices = async () => {
    setIsLoading(true);
    const data = await getUnmatchedInvoices();
    setUnmatchedInvoices(data);
    setIsLoading(false);
  };

  const handleSelectInvoice = async (invoice: any) => {
    setSelectedInvoice(invoice);
    const suggestions = await getSuggestedLineItems(invoice.id);
    setSuggestedLines(suggestions);
  };

  const handleAssign = async (projectId: string, budgetLineId: string | null) => {
    if (!selectedInvoice) return;

    setIsAssigning(true);
    const result = await assignInvoiceToLineItem(
      selectedInvoice.id,
      projectId,
      budgetLineId
    );

    if (result.success) {
      // Remove the assigned invoice from the list
      setUnmatchedInvoices(unmatchedInvoices.filter((inv) => inv.id !== selectedInvoice.id));
      setSelectedInvoice(null);
      setSuggestedLines([]);
    }
    setIsAssigning(false);
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "PRE_PRODUCTION":
        return "Pre-Production";
      case "PRODUCTION":
        return "Production";
      case "POST_PRODUCTION":
        return "Post-Production";
      default:
        return category;
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <Link
        href="/invoices"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Invoice Manager
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <AlertCircle className="w-8 h-8 text-orange-600" />
          <h1 className="text-3xl font-bold text-gray-900">Match Unassigned Invoices</h1>
        </div>
        <p className="text-gray-500">
          Review invoices uploaded by vendors and assign them to the correct line items.
        </p>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">Loading unmatched invoices...</p>
        </div>
      ) : unmatchedInvoices.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Check className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">All Caught Up!</h3>
          <p className="text-gray-500 mb-6">
            There are no unassigned invoices waiting for review.
          </p>
          <Link
            href="/invoices"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
          >
            View All Invoices
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column: Unmatched Invoices List */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Unassigned Invoices ({unmatchedInvoices.length})
            </h2>
            <div className="space-y-3">
              {unmatchedInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  onClick={() => handleSelectInvoice(invoice)}
                  className={`bg-white rounded-lg border-2 p-4 cursor-pointer transition-all ${
                    selectedInvoice?.id === invoice.id
                      ? "border-orange-500 bg-orange-50"
                      : "border-gray-200 hover:border-orange-300"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">{invoice.payee?.name || "Unknown Payee"}</p>
                      <p className="text-sm text-gray-500">{invoice.payee?.email}</p>
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      ${invoice.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      Invoice #{invoice.invoiceNumber || "N/A"}
                    </span>
                    <span className="text-gray-500">
                      {new Date(invoice.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Suggested Line Items */}
          <div>
            {selectedInvoice ? (
              <>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Suggested Line Items for {selectedInvoice.payee?.name}
                </h2>
                {suggestedLines.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                    <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 mb-2">No line items found</p>
                    <p className="text-sm text-gray-500">
                      This payee is not assigned to any budget lines yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {suggestedLines.map((line) => (
                      <div
                        key={line.id}
                        className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-semibold text-gray-900">{line.project.name}</p>
                            <p className="text-sm text-gray-500">{line.project.clientName}</p>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded ${
                            line.project.status === "LIVE"
                              ? "bg-green-100 text-green-700"
                              : "bg-blue-100 text-blue-700"
                          }`}>
                            {line.project.status}
                          </span>
                        </div>

                        <div className="mb-3 p-2 bg-gray-50 rounded">
                          <p className="text-sm font-medium text-gray-700">
                            #{line.lineNumber} - {line.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {getCategoryLabel(line.category)}
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-sm mb-3">
                          <span className="text-gray-600">Estimate:</span>
                          <span className="font-semibold">
                            ${line.estimate.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-sm mb-4">
                          <span className="text-gray-600">Actual Spent:</span>
                          <span className="font-semibold text-orange-600">
                            ${line.actualSpent.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        <button
                          onClick={() => handleAssign(line.projectId, line.id)}
                          disabled={isAssigning}
                          className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isAssigning ? (
                            "Assigning..."
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              Assign to This Line
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <p className="text-gray-500">
                  Select an invoice from the left to see suggested line items
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
