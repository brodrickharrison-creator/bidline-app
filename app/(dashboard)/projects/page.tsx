"use client";

import { FolderOpen, Search, MoreVertical, Trash2, ChevronDown } from "lucide-react";
import Link from "next/link";
import { getProjects, deleteProject, updateProjectStatus } from "@/app/actions/projects";
import { useEffect, useState, memo, useCallback } from "react";

interface ProjectData {
  id: string;
  name: string;
  clientName: string | null;
  status: string;
  ruleset: string;
  totalBudget: number;
  totalSpent: number;
}

// Memoized ProjectCard component to prevent unnecessary re-renders
const ProjectCard = memo(({
  project,
  onDelete,
  onStatusChange
}: {
  project: ProjectData;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: "PLANNING" | "LIVE" | "COMPLETED" | "ARCHIVED") => void;
}) => {
  const [openMenuId, setOpenMenuId] = useState(false);
  const [openStatusId, setOpenStatusId] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const percentUsed = project.totalSpent > 0
    ? (Number(project.totalSpent) / Number(project.totalBudget)) * 100
    : 0;
  const remaining = Number(project.totalBudget) - Number(project.totalSpent);

  const handleStatusChange = async (newStatus: "PLANNING" | "LIVE" | "COMPLETED" | "ARCHIVED") => {
    setIsUpdatingStatus(true);
    await onStatusChange(project.id, newStatus);
    setIsUpdatingStatus(false);
    setOpenStatusId(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow relative">
      {/* Menu Button */}
      <div className="absolute top-4 right-4">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpenMenuId(!openMenuId);
          }}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
        >
          <MoreVertical className="w-5 h-5" />
        </button>

        {/* Dropdown Menu */}
        {openMenuId && (
          <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
            <button
              onClick={() => {
                onDelete(project.id);
                setOpenMenuId(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Project
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-between items-start mb-4 pr-8">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
              project.ruleset === "APA"
                ? "bg-purple-100 text-purple-700"
                : "bg-blue-100 text-blue-700"
            }`}>
              {project.ruleset === "APA" ? "APA" : "Flat"}
            </span>
          </div>
          {project.clientName && (
            <p className="text-sm text-gray-500">Client: {project.clientName}</p>
          )}
        </div>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpenStatusId(!openStatusId);
            }}
            disabled={isUpdatingStatus}
            className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
              project.status === "PLANNING"
                ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                : project.status === "LIVE"
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : project.status === "COMPLETED"
                ? "bg-purple-100 text-purple-700 hover:bg-purple-200"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            } disabled:opacity-50`}
          >
            {project.status.toLowerCase()}
            <ChevronDown className="w-3 h-3" />
          </button>

          {/* Status Dropdown */}
          {openStatusId && (
            <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
              {(["PLANNING", "LIVE", "COMPLETED"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                    project.status === status ? "font-semibold" : ""
                  }`}
                >
                  {status.toLowerCase()}
                </button>
              ))}
            </div>
          )}
        </div>
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
});

ProjectCard.displayName = "ProjectCard";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PLANNING" | "LIVE" | "COMPLETED">("ALL");

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    const data = await getProjects();
    setProjects(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleDeleteClick = useCallback((projectId: string) => {
    setDeleteConfirmId(projectId);
  }, []);

  const handleDeleteConfirm = async (projectId: string) => {
    setIsDeleting(true);
    const result = await deleteProject(projectId);
    if (result.success) {
      setProjects(projects.filter((p) => p.id !== projectId));
      setDeleteConfirmId(null);
    }
    setIsDeleting(false);
  };

  const handleStatusChange = useCallback(async (projectId: string, newStatus: "PLANNING" | "LIVE" | "COMPLETED" | "ARCHIVED") => {
    const result = await updateProjectStatus(projectId, newStatus);
    if (result.success) {
      setProjects((prevProjects) =>
        prevProjects.map((p) => p.id === projectId ? { ...p, status: newStatus } : p)
      );
    }
  }, []);

  // Filter projects based on search and status
  const filteredProjects = projects.filter((project) => {
    // Apply search filter
    const matchesSearch = searchTerm === "" ||
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.clientName && project.clientName.toLowerCase().includes(searchTerm.toLowerCase()));

    // Apply status filter
    const matchesStatus = statusFilter === "ALL" || project.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Loading projects...</p>
      </div>
    );
  }

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
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "ALL" | "PLANNING" | "LIVE" | "COMPLETED")}
          className="pl-4 pr-10 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500 bg-white appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22M6%208l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.5em] bg-[right_0.5rem_center] bg-no-repeat w-[160px] shrink-0"
        >
          <option value="ALL">All</option>
          <option value="PLANNING">Planning</option>
          <option value="LIVE">Live</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Project?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this project? This will permanently delete all budget lines and invoices associated with it. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmId(null)}
                disabled={isDeleting}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteConfirm(deleteConfirmId)}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete Project"}
              </button>
            </div>
          </div>
        </div>
      )}

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
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects found</h3>
          <p className="text-gray-500 mb-6">Try adjusting your search or filters</p>
          <button
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("ALL");
            }}
            className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onDelete={handleDeleteClick}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
