"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createFringeRule(projectId: string, name: string, percentage: number) {
  try {
    const fringeRule = await prisma.fringeRule.create({
      data: {
        projectId,
        name,
        percentage,
      },
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/projects/new");

    return {
      success: true,
      fringeRule: {
        id: fringeRule.id,
        name: fringeRule.name,
        percentage: Number(fringeRule.percentage),
        projectId: fringeRule.projectId,
      },
    };
  } catch (error) {
    console.error("Failed to create fringe rule:", error);
    return { success: false, error: "Failed to create fringe rule" };
  }
}

export async function updateFringeRule(id: string, name: string, percentage: number) {
  try {
    const fringeRule = await prisma.fringeRule.update({
      where: { id },
      data: { name, percentage },
      include: { project: true },
    });

    revalidatePath(`/projects/${fringeRule.projectId}`);
    revalidatePath("/projects/new");

    return {
      success: true,
      fringeRule: {
        id: fringeRule.id,
        name: fringeRule.name,
        percentage: Number(fringeRule.percentage),
        projectId: fringeRule.projectId,
      },
    };
  } catch (error) {
    console.error("Failed to update fringe rule:", error);
    return { success: false, error: "Failed to update fringe rule" };
  }
}

export async function deleteFringeRule(id: string) {
  try {
    const fringeRule = await prisma.fringeRule.delete({
      where: { id },
    });

    revalidatePath(`/projects/${fringeRule.projectId}`);
    revalidatePath("/projects/new");

    return { success: true };
  } catch (error) {
    console.error("Failed to delete fringe rule:", error);
    return { success: false, error: "Failed to delete fringe rule" };
  }
}

export async function assignFringeToLine(budgetLineId: string, fringeRuleId: string | null) {
  try {
    // Get the budget line to access its project and current values
    const budgetLine = await prisma.budgetLine.findUnique({
      where: { id: budgetLineId },
      include: {
        project: true,
        fringeRule: true,
      },
    });

    if (!budgetLine) {
      return { success: false, error: "Budget line not found" };
    }

    // Get the fringe rule if assigning one
    let fringePercent = 0;
    if (fringeRuleId) {
      const fringeRule = await prisma.fringeRule.findUnique({
        where: { id: fringeRuleId },
      });
      if (fringeRule) {
        fringePercent = Number(fringeRule.percentage);
      }
    }

    // Calculate base estimate (without fringe)
    const quantity = Number(budgetLine.quantity) || 0;
    const days = Number(budgetLine.days) || 0;
    const rate = Number(budgetLine.rate) || 0;
    const ot1_5 = Number(budgetLine.ot1_5) || 0;
    const ot2 = Number(budgetLine.ot2) || 0;
    const ot2_5 = Number(budgetLine.ot2_5) || 0;
    const otHours = Number(budgetLine.otHours) || 0;
    const midnightHours = Number(budgetLine.midnightHours) || 0;

    // Calculate base estimate using ruleset
    let baseEstimate = 0;
    if (budgetLine.project.ruleset === "FLAT_RATE") {
      baseEstimate = (quantity * days * rate) + (ot1_5 * rate * 1.5) + (ot2 * rate * 2) + (ot2_5 * rate * 2.5);
    } else {
      // APA calculation
      const bhr = rate / 8;
      const tier1Rate = bhr * 1.5;
      const tier2Rate = bhr * 2.0;
      const tier3Rate = bhr * 3.0;

      const regularPay = quantity * days * rate;
      const otPay = otHours * tier2Rate;
      const midnightPay = midnightHours * tier3Rate;

      baseEstimate = regularPay + otPay + midnightPay;
    }

    // Apply fringe to base estimate
    const fringeAmount = baseEstimate * (fringePercent / 100);
    const newEstimate = baseEstimate + fringeAmount;

    // Update the budget line
    await prisma.budgetLine.update({
      where: { id: budgetLineId },
      data: {
        fringeRuleId: fringeRuleId,
        estimate: newEstimate,
      },
    });

    // Update project total budget
    const allLines = await prisma.budgetLine.findMany({
      where: { projectId: budgetLine.projectId },
    });

    const totalBudget = allLines.reduce((sum, line) => sum + Number(line.estimate), 0);

    await prisma.project.update({
      where: { id: budgetLine.projectId },
      data: { totalBudget },
    });

    revalidatePath(`/projects/${budgetLine.projectId}`);

    return { success: true };
  } catch (error) {
    console.error("Failed to assign fringe to line:", error);
    return { success: false, error: "Failed to assign fringe" };
  }
}
