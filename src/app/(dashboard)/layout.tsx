import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./_components/logout-button";
import { MobileNav } from "./_components/mobile-nav";

const navItems = [
  { href: "/kitchen", label: "食材库" },
  { href: "/recipes", label: "菜谱" },
  { href: "/recipes/generate", label: "AI 生成" },
];

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
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop sidebar — hidden on mobile */}
      <aside className="hidden md:flex w-56 shrink-0 border-r border-gray-200 bg-white flex-col">
        <div className="px-6 py-5 border-b border-gray-100">
          <span className="text-lg font-bold tracking-tight text-gray-900">Cheif</span>
          <p className="text-xs text-gray-400 mt-0.5">智能厨房助手</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center px-3 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-gray-100">
          <p className="px-3 mb-2 text-xs text-gray-400 truncate">{user.email}</p>
          <LogoutButton />
        </div>
      </aside>

      {/* Main content — extra bottom padding on mobile for tab bar */}
      <main className="flex-1 min-w-0 pb-16 md:pb-0">{children}</main>

      {/* Mobile bottom tab bar */}
      <MobileNav />
    </div>
  );
}
