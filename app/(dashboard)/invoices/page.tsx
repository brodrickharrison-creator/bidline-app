"use client";

import { FileText, Search, Plus, Trash2, Check, Flag, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { getInvoices, updateInvoiceStatus, deleteInvoice } from "@/app/actions/invoices";

interface InvoiceData {
  id: string;
  invoiceNumber: string | null;
  amount: number;
  status: string;
  payee: { id: string; name: string } | null;
  project: { id: string; name: string } | null;
  budgetLine: { id: string; lineNumber: number; name: string } | null;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isLoading, setIsLoading] = useState(true);

  const loadInvoices = useCallback(async () => {
    setIsLoading(true);
    const data = await getInvoices({ status: statusFilter });
    setInvoices(data);
    setIsLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const handleStatusChange = async (invoiceId: string, newStatus: string) => {
    const result = await updateInvoiceStatus(invoiceId, newStatus as "MISSING" | "WAITING_APPROVAL" | "APPROVED" | "FLAGGED" | "PAID");
    if (result.success) {
      loadInvoices();
    }
  };

  const handleDelete = async (invoiceId: string) => {
    if (confirm("Are you sure you want to delete this invoice?")) {
      const result = await deleteInvoice(invoiceId);
      if (result.success) {
        loadInvoices();
      }
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      !searchTerm ||
      invoice.payee?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.project?.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-green-100 text-green-700";
      case "APPROVED":
        return "bg-blue-100 text-blue-700";
      case "FLAGGED":
        return "bg-red-100 text-red-700";
      case "MISSING":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-orange-100 text-orange-700";
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">Invoice Manager</h1>
          </div>
          <p className="text-gray-500">Review, approve, and manage all project invoices.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/invoices/match"
            className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4" />
            Match Invoices
          </Link>
          <Link
            href="/upload"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Upload Invoice
          </Link>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by payee, invoice #, or project..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="pl-4 pr-10 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22M6%208l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.5em] bg-[right_0.5rem_center] bg-no-repeat w-[160px] shrink-0"
        >
          <option>All</option>
          <option>Waiting Approval</option>
          <option>Approved</option>
          <option>Flagged</option>
          <option>Paid</option>
          <option>Missing</option>
        </select>
      </div>

      {/* Invoices List */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">Loading invoices...</p>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchTerm || statusFilter !== "All" ? "No invoices found" : "No invoices yet"}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || statusFilter !== "All"
              ? "Try adjusting your search or filters"
              : "Upload an invoice to get started"}
          </p>
          {!searchTerm && statusFilter === "All" && (
            <Link
              href="/invoices/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
            >
              <Plus className="w-4 h-4" />
              Upload First Invoice
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Budget Line
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => window.location.href = `/invoices/${invoice.id}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {invoice.invoiceNumber || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invoice.payee?.name || "Unknown"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invoice.project ? (
                        <Link href={`/projects/${invoice.project.id}`} className="hover:text-purple-600" onClick={(e) => e.stopPropagation()}>
                          {invoice.project.name}
                        </Link>
                      ) : (
                        <span className="text-gray-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invoice.budgetLine ? `#${invoice.budgetLine.lineNumber} ${invoice.budgetLine.name}` : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      ${Number(invoice.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={invoice.status}
                        onChange={(e) => handleStatusChange(invoice.id, e.target.value)}
                        className={`text-xs px-3 py-1 rounded-full font-medium cursor-pointer ${getStatusColor(invoice.status)}`}
                      >
                        <option value="WAITING_APPROVAL">Waiting Approval</option>
                        <option value="APPROVED">Approved</option>
                        <option value="FLAGGED">Flagged</option>
                        <option value="PAID">Paid</option>
                        <option value="MISSING">Missing</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleStatusChange(invoice.id, "APPROVED")}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                          title="Approve"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleStatusChange(invoice.id, "FLAGGED")}
                          className="p-1 text-orange-600 hover:bg-orange-50 rounded"
                          title="Flag"
                        >
                          <Flag className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(invoice.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
