"use client";

/**
 * External Invoice Upload Page
 *
 * Public-facing page for vendors to submit invoices.
 * No authentication required - auto-matches based on email.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, DollarSign, Mail, Hash } from "lucide-react";
import { uploadExternalInvoice } from "@/app/actions/external-upload";

export default function ExternalUploadPage() {
  const router = useRouter();

  // Form state
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // File handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = ["application/pdf", "image/png", "image/jpeg"];
    if (!validTypes.includes(selectedFile.type)) {
      setError("Please upload a PDF, PNG, or JPG file");
      return;
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (selectedFile.size > maxSize) {
      setError("File size must be less than 10MB");
      return;
    }

    setFile(selectedFile);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (!projectCode.trim()) {
      setError("Project code is required");
      return;
    }

    if (!file) {
      setError("Please select an invoice file");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await uploadExternalInvoice({
        email: email.trim(),
        amount: parseFloat(amount),
        projectCode: projectCode.trim(),
        fileName: file.name,
      });

      if (result.success && result.invoice) {
        // Redirect to success page with invoice details
        router.push(
          `/upload/success?id=${result.invoice.id}&timestamp=${result.invoice.createdAt.toISOString()}`
        );
      } else {
        setError(result.error || "Failed to upload invoice");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-full mb-4">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Submit Your Invoice
          </h1>
          <p className="text-gray-600">
            Upload your invoice - we'll match it to the right project for you
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice File *
              </label>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  file
                    ? "border-purple-500 bg-purple-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  {file ? (
                    <div>
                      <p className="text-sm font-medium text-purple-600 mb-1">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <p className="text-xs text-purple-600 mt-2">
                        Click to change file
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">
                        Drop invoice file here or click to browse
                      </p>
                      <p className="text-xs text-gray-500">
                        PDF, PNG, JPG up to 10MB
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vendor@example.com"
                  required
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                We'll use this to match your invoice to the correct project
              </p>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice Amount *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Project Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Code *
              </label>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={projectCode}
                  onChange={(e) => setProjectCode(e.target.value)}
                  placeholder="PROJ-2024-001"
                  required
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Enter the project code provided by the production team
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-6 py-4 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? "Uploading..." : "Submit Invoice"}
            </button>
          </form>
        </div>

        {/* Info Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Questions? Contact the production team for assistance.
          </p>
        </div>
      </div>
    </div>
  );
}
