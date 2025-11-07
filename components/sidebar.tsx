"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  Users,
  Settings,
  Layers
} from "lucide-react";
import { useEffect, useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Projects", href: "/projects", icon: FolderOpen },
  { name: "Invoice Manager", href: "/invoices", icon: FileText },
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [stats, setStats] = useState({ activeProjects: 0, pendingInvoices: 0, totalBudget: 0 });

  useEffect(() => {
    // Fetch stats from API
    fetch("/api/sidebar-stats")
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(() => {
        // Silently fail - stats will show 0
      });
  }, [pathname]); // Refetch when route changes

  return (
    <div className="flex h-screen w-60 flex-col bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex items-center gap-3 p-6 border-b border-gray-200">
        <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
          <Layers className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg">BidLine</h1>
          <p className="text-xs text-gray-500">Production Finance</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }
              `}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Quick Stats */}
      <div className="p-4 border-t border-gray-200">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Quick Stats</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Active Projects</span>
            <span className="font-semibold">{stats.activeProjects}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Pending Invoices</span>
            <span className="font-semibold text-orange-600">{stats.pendingInvoices}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Total Budget</span>
            <span className="font-semibold text-green-600">
              ${stats.totalBudget.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
