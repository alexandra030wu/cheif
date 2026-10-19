import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HamburgerMenu } from "./_components/hamburger-menu";
import { SideNav } from "./_components/side-nav";

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
    <div className="relative min-h-screen bg-canvas pt-[env(safe-area-inset-top)]">
      <SideNav />
      {/* 移动端沿用抽屉(桌面隐藏;移动端导航方案待定) */}
      <div className="md:hidden">
        <HamburgerMenu userEmail={user.email ?? ""} />
      </div>
      {/* 桌面:左侧让出侧栏宽度(w-52),内容在剩余区域居中;手机零影响 */}
      <div className="md:pl-52">
        <main className="mx-auto w-full max-w-3xl md:pt-4 min-h-[calc(100vh-env(safe-area-inset-top))]">{children}</main>
      </div>
    </div>
  );
}
