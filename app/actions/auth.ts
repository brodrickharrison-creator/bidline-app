"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function signup(formData: {
  email: string;
  password: string;
  name: string;
}) {
  const supabase = await createClient();

  // Sign up the user with Supabase Auth
  const { data, error } = await supabase.auth.signUp({
    email: formData.email,
    password: formData.password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data.user) {
    return { success: false, error: "Failed to create user" };
  }

  // Create user record in our database
  try {
    await prisma.user.create({
      data: {
        id: data.user.id,
        email: formData.email,
        name: formData.name,
      },
    });
  } catch (dbError: unknown) {
    // If user already exists in database, that's okay
    console.error("Database error:", dbError);
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function login(formData: { email: string; password: string }) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.email,
    password: formData.password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  return { success: true };
}

export async function getCurrentUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Get full user data from database
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  return dbUser;
}
