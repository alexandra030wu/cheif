import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HamburgerMenu } from "./_components/hamburger-menu";
import { TopNav } from "./_components/top-nav";

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
      <TopNav userEmail={user.email ?? ""} />
      {/* 移动端沿用抽屉(桌面隐藏;移动端导航方案待定) */}
      <div className="md:hidden">
        <HamburgerMenu userEmail={user.email ?? ""} />
      </div>
      {/* 桌面响应式:内容居中列,宽屏留 canvas 大留白(手机上 max-w 不生效,零影响) */}
      <main className="mx-auto w-full max-w-3xl md:pt-2 min-h-[calc(100vh-env(safe-area-inset-top))]">{children}</main>
    </div>
  );
}
