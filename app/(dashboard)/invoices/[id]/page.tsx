"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText, CheckCircle, Clock, Flag, XCircle, DollarSign } from "lucide-react";
import Link from "next/link";
import { getInvoiceById, updateInvoiceStatus } from "@/app/actions/invoices";

export default function InvoiceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);

  useEffect(() => {
    loadInvoice();
  }, [params.id]);

  const loadInvoice = async () => {
    setIsLoading(true);
    const data = await getInvoiceById(params.id as string);
    setInvoice(data);
    setIsLoading(false);
  };

  const handleStatusUpdate = async (newStatus: string) => {
    const result = await updateInvoiceStatus(invoice.id, newStatus as any);
    if (result.success) {
      loadInvoice();
      setShowStatusModal(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Approved
          </div>
        );
      case "PAID":
        return (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Paid
          </div>
        );
      case "FLAGGED":
        return (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium">
            <Flag className="w-4 h-4" />
            Flagged
          </div>
        );
      case "MISSING":
        return (
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">
            <XCircle className="w-4 h-4" />
            Missing
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium">
            <Clock className="w-4 h-4" />
            Waiting for Approval
          </div>
        );
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "PRE_PRODUCTION":
        return "PRE-PRODUCTION";
      case "PRODUCTION":
        return "PRODUCTION";
      case "POST_PRODUCTION":
        return "POST-PRODUCTION";
      default:
        return category;
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">Loading invoice details...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Invoice not found</h3>
          <p className="text-gray-500 mb-6">This invoice may have been deleted or does not exist.</p>
          <Link
            href="/invoices"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Invoice Manager
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Back Button */}
      <Link
        href="/invoices"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Invoice Manager
      </Link>

      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">Invoice Details</h1>
          </div>
          <p className="text-gray-500">Review invoice information and status</p>
        </div>
        <div className="flex items-center gap-4">
          {getStatusBadge(invoice.status)}
          <button
            onClick={() => setShowStatusModal(true)}
            className="px-6 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800"
          >
            Update Status
          </button>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Invoice Information */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">Invoice Information</h2>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Payee</p>
              <p className="text-base font-medium text-gray-900">
                {invoice.payee?.name || "Unknown"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Amount</p>
              <p className="text-2xl font-bold text-gray-900">
                ${invoice.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Date</p>
              <p className="text-base font-medium text-gray-900">
                {new Date(invoice.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Invoice Number</p>
              <p className="text-base font-medium text-gray-900">
                {invoice.invoiceNumber || "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Submitted By</p>
              <p className="text-base font-medium text-gray-900">
                {invoice.payee?.email || "-"}
              </p>
            </div>
          </div>
        </div>

        {/* Project & Budget */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <DollarSign className="w-5 h-5 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">Project & Budget</h2>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Project</p>
              <Link
                href={`/projects/${invoice.project.id}`}
                className="text-base font-medium text-teal-600 hover:text-teal-700"
              >
                {invoice.project.name}
              </Link>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Client</p>
              <p className="text-base font-medium text-gray-900">
                {invoice.project.clientName || "-"}
              </p>
            </div>

            {invoice.budgetLine && (
              <>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Budget Line Item</p>
                  <p className="text-base font-medium text-gray-900">
                    {invoice.budgetLine.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {invoice.budgetLine.lineNumber ? `A/B: ` : ""}
                    {getCategoryLabel(invoice.budgetLine.category)}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Document */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <FileText className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Invoice Document</h2>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Invoice Document</p>
              <p className="text-sm text-gray-500">Click to view or download</p>
            </div>
          </div>
          <button className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Open Document
          </button>
        </div>
      </div>

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Update Invoice Status</h3>
            <div className="space-y-2">
              <button
                onClick={() => handleStatusUpdate("WAITING_APPROVAL")}
                className="w-full px-4 py-3 text-left rounded-lg hover:bg-orange-50 border border-gray-200"
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span className="font-medium">Waiting for Approval</span>
                </div>
              </button>
              <button
                onClick={() => handleStatusUpdate("APPROVED")}
                className="w-full px-4 py-3 text-left rounded-lg hover:bg-blue-50 border border-gray-200"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">Approved</span>
                </div>
              </button>
              <button
                onClick={() => handleStatusUpdate("PAID")}
                className="w-full px-4 py-3 text-left rounded-lg hover:bg-green-50 border border-gray-200"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="font-medium">Paid</span>
                </div>
              </button>
              <button
                onClick={() => handleStatusUpdate("FLAGGED")}
                className="w-full px-4 py-3 text-left rounded-lg hover:bg-red-50 border border-gray-200"
              >
                <div className="flex items-center gap-2">
                  <Flag className="w-4 h-4 text-red-600" />
                  <span className="font-medium">Flagged</span>
                </div>
              </button>
              <button
                onClick={() => handleStatusUpdate("MISSING")}
                className="w-full px-4 py-3 text-left rounded-lg hover:bg-gray-50 border border-gray-200"
              >
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-gray-600" />
                  <span className="font-medium">Missing</span>
                </div>
              </button>
            </div>
            <button
              onClick={() => setShowStatusModal(false)}
              className="w-full mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
