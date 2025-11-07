import { redirect } from "next/navigation";

export default function Home() {
  // For now, redirect to dashboard. Later, this will be the login page.
  redirect("/dashboard");
}
