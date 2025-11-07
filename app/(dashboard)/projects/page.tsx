import { FolderOpen, Search, Filter } from "lucide-react";
import Link from "next/link";
import { getProjects } from "@/app/actions/projects";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FolderOpen className="w-8 h-8 text-green-600" />
            <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          </div>
          <p className="text-gray-500">Manage your production budgets and finances</p>
        </div>
        <Link href="/projects/new" className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
          + New Project
        </Link>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search projects..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2">
          <Filter className="w-4 h-4" />
          All Status
        </button>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects yet</h3>
          <p className="text-gray-500 mb-6">Get started by creating your first production budget</p>
          <Link href="/projects/new" className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700">
            + Create First Project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const percentUsed = project.totalSpent > 0
              ? (Number(project.totalSpent) / Number(project.totalBudget)) * 100
              : 0;
            const remaining = Number(project.totalBudget) - Number(project.totalSpent);

            return (
              <div key={project.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{project.name}</h3>
                    {project.clientName && (
                      <p className="text-sm text-gray-500">Client: {project.clientName}</p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    project.status === "PLANNING"
                      ? "bg-blue-100 text-blue-700"
                      : project.status === "LIVE"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  }`}>
                    {project.status.toLowerCase()}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Budget</span>
                    <span className="font-semibold">${Number(project.totalBudget).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Spent</span>
                    <span className="font-semibold">${Number(project.totalSpent).toLocaleString()}</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="pt-2">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>{percentUsed.toFixed(1)}% used</span>
                      <span className="text-green-600">${remaining.toLocaleString()} remaining</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(percentUsed, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <Link
                  href={`/projects/${project.id}`}
                  className="w-full block text-center px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                >
                  Open Project
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
