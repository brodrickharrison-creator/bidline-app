"use server";

import { prisma } from "@/lib/prisma";

export async function getDashboardStats() {
  try {
    // Get total budget across all projects
    const projects = await prisma.project.findMany({
      select: {
        totalBudget: true,
        totalSpent: true,
        status: true,
      },
    });

    const totalBudget = projects.reduce((sum, p) => sum + Number(p.totalBudget), 0);
    const totalSpent = projects.reduce((sum, p) => sum + Number(p.totalSpent), 0);
    const activeProjects = projects.filter((p) => p.status === "PLANNING" || p.status === "LIVE").length;

    // Get pending invoices count
    const pendingInvoices = await prisma.invoice.count({
      where: {
        status: {
          in: ["MISSING", "WAITING_APPROVAL"],
        },
      },
    });

    // Get recent invoices
    const recentInvoices = await prisma.invoice.findMany({
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        payee: true,
        project: true,
      },
    });

    // Get active projects with details
    const activeProjectsList = await prisma.project.findMany({
      where: {
        status: {
          in: ["PLANNING", "LIVE"],
        },
      },
      take: 3,
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      totalBudget,
      totalSpent,
      variance: totalBudget - totalSpent,
      activeProjects,
      pendingInvoices,
      recentInvoices,
      activeProjectsList,
    };
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
    return {
      totalBudget: 0,
      totalSpent: 0,
      variance: 0,
      activeProjects: 0,
      pendingInvoices: 0,
      recentInvoices: [],
      activeProjectsList: [],
    };
  }
}
