"use client";

import { FileText, Search, Filter, Plus, Trash2, Check, X, Flag } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getInvoices, updateInvoiceStatus, deleteInvoice } from "@/app/actions/invoices";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInvoices();
  }, [statusFilter]);

  const loadInvoices = async () => {
    setIsLoading(true);
    const data = await getInvoices({ status: statusFilter });
    setInvoices(data);
    setIsLoading(false);
  };

  const handleStatusChange = async (invoiceId: string, newStatus: string) => {
    const result = await updateInvoiceStatus(invoiceId, newStatus as any);
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
      invoice.project.name.toLowerCase().includes(searchTerm.toLowerCase());
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
        <Link
          href="/invoices/new"
          className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Upload Invoice
        </Link>
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
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 pr-10 border border-gray-300 rounded-lg appearance-none bg-white cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option>All Status</option>
            <option>Waiting Approval</option>
            <option>Approved</option>
            <option>Flagged</option>
            <option>Paid</option>
            <option>Missing</option>
          </select>
          <Filter className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
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
            {searchTerm || statusFilter !== "All Status" ? "No invoices found" : "No invoices yet"}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || statusFilter !== "All Status"
              ? "Try adjusting your search or filters"
              : "Upload an invoice to get started"}
          </p>
          {!searchTerm && statusFilter === "All Status" && (
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
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {invoice.invoiceNumber || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invoice.payee?.name || "Unknown"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Link href={`/projects/${invoice.project.id}`} className="hover:text-purple-600">
                        {invoice.project.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invoice.budgetLine ? `#${invoice.budgetLine.lineNumber} ${invoice.budgetLine.name}` : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      ${Number(invoice.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
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
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
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
