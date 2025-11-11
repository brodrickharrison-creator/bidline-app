import { CreditCard, TrendingUp, FileText, FolderOpen } from "lucide-react";
import Link from "next/link";
import { getDashboardStats } from "@/app/actions/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financial Dashboard</h1>
          <p className="text-gray-500 mt-1">Production finance overview and management</p>
        </div>
        <div className="flex gap-3">
          <Link href="/invoices/new" className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
            Upload Invoice
          </Link>
          <Link href="/projects/new" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            + New Project
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* Bank Balance */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Bank Balance</h3>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold mb-2">$0</p>
          <p className="text-sm text-gray-500">Not Connected</p>
        </div>

        {/* Budget Overview */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Budget Overview</h3>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Budget</span>
              <span className="font-semibold">${stats.totalBudget.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Spent</span>
              <span className="font-semibold">${stats.totalSpent.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="text-gray-600">Variance</span>
              <span className={`font-semibold ${stats.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.variance >= 0 ? '↑' : '↓'} ${Math.abs(stats.variance).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Activity Summary */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Activity Summary</h3>
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Active Projects</span>
              <span className="font-semibold text-blue-600">{stats.activeProjects}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pending Invoices</span>
              <span className="font-semibold text-orange-600">{stats.pendingInvoices}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold">Recent Invoices</h2>
            </div>
            <Link href="/invoices" className="text-sm text-blue-600 hover:text-blue-700">View All →</Link>
          </div>
          {stats.recentInvoices.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium mb-2">No invoices yet</p>
              <p className="text-sm text-gray-400 mb-4">Start by creating a project, then upload invoices to track expenses</p>
              <Link
                href="/projects/new"
                className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
              >
                Create Your First Project
              </Link>
            </div>
          ) : (
            <div className="p-6">
              <div className="space-y-3">
                {stats.recentInvoices.map((invoice) => (
                  <div key={invoice.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{invoice.payee?.name || "Unknown Payee"}</p>
                      <p className="text-xs text-gray-500">{invoice.project?.name || "Unknown Project"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">${Number(invoice.amount).toLocaleString()}</p>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        invoice.status === "PAID"
                          ? "bg-green-100 text-green-700"
                          : invoice.status === "APPROVED"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-orange-100 text-orange-700"
                      }`}>
                        {invoice.status.toLowerCase().replace("_", " ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Active Projects */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-semibold">Active Projects</h2>
            </div>
            <Link href="/projects" className="text-sm text-blue-600 hover:text-blue-700">View All →</Link>
          </div>
          {stats.activeProjectsList.length === 0 ? (
            <div className="p-12 text-center">
              <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium mb-2">No active projects</p>
              <p className="text-sm text-gray-400 mb-4">Create a project to start tracking your production budget</p>
              <Link
                href="/projects/new"
                className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
              >
                + Create Project
              </Link>
            </div>
          ) : (
            <div className="p-6">
              <div className="space-y-3">
                {stats.activeProjectsList.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{project.name}</p>
                      {project.clientName && (
                        <p className="text-xs text-gray-500">{project.clientName}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">${Number(project.totalBudget).toLocaleString()}</p>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        project.status === "PLANNING"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-green-100 text-green-700"
                      }`}>
                        {project.status.toLowerCase()}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
