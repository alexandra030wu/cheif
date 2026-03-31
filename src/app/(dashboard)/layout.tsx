import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HamburgerMenu } from "./_components/hamburger-menu";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="relative min-h-screen bg-gray-50">
      <HamburgerMenu userEmail={user.email ?? ""} />
      <main className="min-h-screen">{children}</main>
    </div>
  );
}
