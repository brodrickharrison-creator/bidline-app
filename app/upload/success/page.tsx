"use client";

/**
 * Invoice Upload Success Page
 *
 * Shows confirmation after successful external invoice upload.
 */

import { useSearchParams } from "next/navigation";
import { CheckCircle, Clock, Flag } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export default function UploadSuccessPage() {
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get("id");
  const timestamp = searchParams.get("timestamp");

  const formattedDate = timestamp
    ? formatDateTime(new Date(timestamp))
    : formatDateTime(new Date());

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 flex items-center justify-center">
      <div className="max-w-md w-full">
        {/* Success Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          {/* Success Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Invoice Uploaded Successfully!
          </h1>

          <p className="text-gray-600 mb-8">
            We've received your invoice and it's being processed.
          </p>

          {/* Details */}
          <div className="space-y-4 mb-8">
            {/* Timestamp */}
            <div className="flex items-center justify-center gap-3 text-gray-700">
              <Clock className="w-5 h-5 text-gray-400" />
              <div className="text-left">
                <p className="text-xs text-gray-500">Submitted</p>
                <p className="text-sm font-medium">{formattedDate}</p>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-center gap-3 text-gray-700">
              <Flag className="w-5 h-5 text-orange-400" />
              <div className="text-left">
                <p className="text-xs text-gray-500">Status</p>
                <p className="text-sm font-medium">
                  <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
                    Waiting for Approval
                  </span>
                </p>
              </div>
            </div>

            {/* Reference */}
            {invoiceId && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Reference ID</p>
                <p className="text-sm font-mono text-gray-700 bg-gray-50 px-3 py-2 rounded">
                  {invoiceId.substring(0, 12)}...
                </p>
              </div>
            )}
          </div>

          {/* What's Next */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              What happens next?
            </h3>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>✓ Your invoice has been matched to your assigned project</li>
              <li>✓ The production team will review your submission</li>
              <li>✓ You'll be notified once it's approved for payment</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <a
              href="/upload"
              className="block w-full px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              Submit Another Invoice
            </a>

            <p className="text-xs text-gray-500">
              Need help? Contact the production team.
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Keep this reference ID for your records
          </p>
        </div>
      </div>
    </div>
  );
}
