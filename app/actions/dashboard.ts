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
    const recentInvoicesRaw = await prisma.invoice.findMany({
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        payee: true,
        project: true,
      },
    });

    // Convert Decimal fields for recent invoices
    const recentInvoices = recentInvoicesRaw.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amount: Number(invoice.amount),
      status: invoice.status,
      payeeId: invoice.payeeId,
      projectId: invoice.projectId,
      budgetLineId: invoice.budgetLineId,
      paidAt: invoice.paidAt,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
      payee: invoice.payee ? {
        id: invoice.payee.id,
        name: invoice.payee.name,
        email: invoice.payee.email,
        phone: invoice.payee.phone,
      } : null,
      project: {
        id: invoice.project.id,
        name: invoice.project.name,
        clientName: invoice.project.clientName,
        status: invoice.project.status,
        totalBudget: Number(invoice.project.totalBudget),
        totalSpent: Number(invoice.project.totalSpent),
        createdAt: invoice.project.createdAt,
        updatedAt: invoice.project.updatedAt,
        userId: invoice.project.userId,
      },
    }));

    // Get active projects with details
    const activeProjectsListRaw = await prisma.project.findMany({
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

    // Convert Decimal fields for active projects
    const activeProjectsList = activeProjectsListRaw.map((project) => ({
      id: project.id,
      name: project.name,
      clientName: project.clientName,
      status: project.status,
      totalBudget: Number(project.totalBudget),
      totalSpent: Number(project.totalSpent),
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      userId: project.userId,
    }));

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
