"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  Users,
  Settings,
  Layers,
  LogOut,
  User
} from "lucide-react";
import { useEffect, useState } from "react";
import { signout } from "@/app/actions/auth";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Projects", href: "/projects", icon: FolderOpen },
  { name: "Invoice Manager", href: "/invoices", icon: FileText },
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [stats, setStats] = useState({ activeProjects: 0, pendingInvoices: 0, totalBudget: 0 });
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    // Fetch stats from API
    fetch("/api/sidebar-stats")
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(() => {
        // Silently fail - stats will show 0
      });

    // Fetch current user
    fetch("/api/current-user")
      .then((res) => res.json())
      .then((data) => setUser(data))
      .catch(() => {
        // Silently fail
      });
  }, [pathname]); // Refetch when route changes

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    await signout();
    router.push("/login");
    router.refresh();
  };

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

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-gray-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.name || "Loading..."}
            </p>
            <p className="text-xs text-gray-500 truncate">{user?.email || ""}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          disabled={isLoggingOut}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LogOut className="w-4 h-4" />
          {isLoggingOut ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </div>
  );
}
