"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createContact(data: {
  name: string;
  email?: string;
  phone?: string;
}) {
  try {
    // For now, use temp user ID
    const userId = "temp-user-id";

    const contact = await prisma.contact.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        userId,
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
    const contacts = await prisma.contact.findMany({
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
  }
) {
  try {
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
