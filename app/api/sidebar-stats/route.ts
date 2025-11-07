import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [projects, pendingInvoices] = await Promise.all([
      prisma.project.findMany({
        where: {
          status: {
            in: ["PLANNING", "LIVE"],
          },
        },
        select: {
          totalBudget: true,
        },
      }),
      prisma.invoice.count({
        where: {
          status: {
            in: ["MISSING", "WAITING_APPROVAL"],
          },
        },
      }),
    ]);

    const totalBudget = projects.reduce((sum, p) => sum + Number(p.totalBudget), 0);

    return NextResponse.json({
      activeProjects: projects.length,
      pendingInvoices,
      totalBudget,
    });
  } catch (error) {
    console.error("Failed to fetch sidebar stats:", error);
    return NextResponse.json(
      { activeProjects: 0, pendingInvoices: 0, totalBudget: 0 },
      { status: 500 }
    );
  }
}
