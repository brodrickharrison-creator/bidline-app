"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "./auth";

export async function createContact(data: {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  role?: string;
}) {
  try {
    // Get authenticated user
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "Unauthorized - please log in" };
    }

    const contact = await prisma.contact.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        role: data.role,
        userId: user.id,
      },
    });

    revalidatePath("/contacts");

    return { success: true, contact };
  } catch (error) {
    console.error("Failed to create contact:", error);
    return { success: false, error: "Failed to create contact" };
  }
}

export async function getContacts() {
  try {
    // Get authenticated user
    const user = await getCurrentUser();

    if (!user) {
      return [];
    }

    const contacts = await prisma.contact.findMany({
      where: {
        userId: user.id,
      },
      include: {
        _count: {
          select: {
            invoices: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Get total paid for each contact
    const contactsWithTotals = await Promise.all(
      contacts.map(async (contact) => {
        const invoices = await prisma.invoice.findMany({
          where: {
            payeeId: contact.id,
            status: "PAID",
          },
        });

        const totalPaid = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);

        return {
          ...contact,
          totalPaid,
        };
      })
    );

    return contactsWithTotals;
  } catch (error) {
    console.error("Failed to fetch contacts:", error);
    return [];
  }
}

export async function updateContact(
  id: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    role?: string;
  }
) {
  try {
    // Get authenticated user
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "Unauthorized - please log in" };
    }

    // Verify the contact belongs to the user
    const existingContact = await prisma.contact.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existingContact || existingContact.userId !== user.id) {
      return { success: false, error: "Contact not found or unauthorized" };
    }

    const contact = await prisma.contact.update({
      where: { id },
      data,
    });

    revalidatePath("/contacts");

    return { success: true, contact };
  } catch (error) {
    console.error("Failed to update contact:", error);
    return { success: false, error: "Failed to update contact" };
  }
}

export async function deleteContact(id: string) {
  try {
    // Get authenticated user
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "Unauthorized - please log in" };
    }

    // Verify the contact belongs to the user
    const existingContact = await prisma.contact.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existingContact || existingContact.userId !== user.id) {
      return { success: false, error: "Contact not found or unauthorized" };
    }

    await prisma.contact.delete({
      where: { id },
    });

    revalidatePath("/contacts");

    return { success: true };
  } catch (error) {
    console.error("Failed to delete contact:", error);
    return { success: false, error: "Failed to delete contact" };
  }
}
