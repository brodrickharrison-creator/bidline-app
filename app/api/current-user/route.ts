import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/actions/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ name: null, email: null }, { status: 401 });
    }

    return NextResponse.json({
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    console.error("Failed to fetch current user:", error);
    return NextResponse.json({ name: null, email: null }, { status: 500 });
  }
}
