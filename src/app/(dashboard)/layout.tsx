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
    <div className="relative min-h-screen bg-gray-50 pt-[env(safe-area-inset-top)]">
      <HamburgerMenu userEmail={user.email ?? ""} />
      <main className="min-h-[calc(100vh-env(safe-area-inset-top))]">{children}</main>
    </div>
  );
}
