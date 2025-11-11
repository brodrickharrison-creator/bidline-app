"use client";

import { ArrowLeft, Upload, Plus } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createInvoice } from "@/app/actions/invoices";
import { getProjects } from "@/app/actions/projects";
import { getContacts, createContact } from "@/app/actions/contacts";

interface ProjectData {
  id: string;
  name: string;
  clientName: string | null;
  budgetLines: BudgetLineData[];
}

interface BudgetLineData {
  id: string;
  lineNumber: number;
  name: string;
  estimate: number;
}

interface ContactData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const preSelectedProjectId = searchParams.get('project');

  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [contacts, setContacts] = useState<ContactData[]>([]);
  const [budgetLines, setBudgetLines] = useState<BudgetLineData[]>([]);

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [projectId, setProjectId] = useState(preSelectedProjectId || "");
  const [budgetLineId, setBudgetLineId] = useState("");
  const [payeeId, setPayeeId] = useState("");
  const [status, setStatus] = useState<"WAITING_APPROVAL" | "APPROVED" | "FLAGGED" | "PAID">("WAITING_APPROVAL");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New contact modal
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");

  const loadData = useCallback(async () => {
    const [projectsData, contactsData] = await Promise.all([
      getProjects(),
      getContacts(),
    ]);
    setProjects(projectsData);
    setContacts(contactsData);

    // If project was pre-selected, load its budget lines
    if (preSelectedProjectId && projectsData.length > 0) {
      const project = projectsData.find((p: ProjectData) => p.id === preSelectedProjectId);
      if (project) {
        setBudgetLines(project.budgetLines || []);
      }
    }
  }, [preSelectedProjectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (projectId) {
      const project = projects.find((p) => p.id === projectId);
      if (project) {
        setBudgetLines(project.budgetLines || []);
      }
    } else {
      setBudgetLines([]);
      setBudgetLineId("");
    }
  }, [projectId, projects]);

  const handleCreateContact = async () => {
    if (!newContactName.trim()) {
      alert("Contact name is required");
      return;
    }

    const result = await createContact({
      name: newContactName,
      email: newContactEmail.trim() || "",
      phone: newContactPhone.trim() || "",
    });

    if (result.success && result.contact) {
      setContacts([...contacts, result.contact]);
      setPayeeId(result.contact.id);
      setShowNewContactModal(false);
      setNewContactName("");
      setNewContactEmail("");
      setNewContactPhone("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectId) {
      setError("Please select a project");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createInvoice({
        invoiceNumber: invoiceNumber || undefined,
        amount: parseFloat(amount),
        projectId,
        budgetLineId: budgetLineId || undefined,
        payeeId: payeeId || undefined,
        status,
      });

      if (result.success) {
        router.push("/invoices");
      } else {
        setError(result.error || "Failed to create invoice");
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
      <Link href="/invoices" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Invoices
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Invoice</h1>
        <p className="text-gray-500">Add a new invoice and assign it to a project</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl">
        <div className="bg-white rounded-xl border border-gray-200 p-8 space-y-6">
          {/* File Upload Placeholder */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invoice File
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Drop invoice file here or click to browse</p>
              <p className="text-xs text-gray-500 mt-1">PDF, PNG, JPG up to 10MB</p>
            </div>
            <p className="text-xs text-gray-500 mt-2">Note: File upload will be implemented with cloud storage</p>
          </div>

          {/* Invoice Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invoice Number (Optional)
            </label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="INV-001"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                required
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Project */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project *
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Select a project...</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} {project.clientName && `- ${project.clientName}`}
                </option>
              ))}
            </select>
          </div>

          {/* Budget Line (Optional) */}
          {budgetLines.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Budget Line (Optional)
              </label>
              <select
                value={budgetLineId}
                onChange={(e) => setBudgetLineId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Not assigned to specific line</option>
                {budgetLines.map((line: BudgetLineData) => (
                  <option key={line.id} value={line.id}>
                    #{line.lineNumber} - {line.name} (${Number(line.estimate).toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Payee */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payee/Vendor
            </label>
            <div className="flex gap-2">
              <select
                value={payeeId}
                onChange={(e) => setPayeeId(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select a payee...</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewContactModal(true)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New
              </button>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "WAITING_APPROVAL" | "APPROVED" | "FLAGGED" | "PAID")}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="WAITING_APPROVAL">Waiting Approval</option>
              <option value="APPROVED">Approved</option>
              <option value="FLAGGED">Flagged</option>
              <option value="PAID">Paid</option>
            </select>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Link
              href="/invoices"
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Saving..." : "Save Invoice"}
            </button>
          </div>
        </div>
      </form>

      {/* New Contact Modal */}
      {showNewContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New Contact</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={newContactEmail}
                  onChange={(e) => setNewContactEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewContactModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateContact}
                  className="flex-1 px-4 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800"
                >
                  Add Contact
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
