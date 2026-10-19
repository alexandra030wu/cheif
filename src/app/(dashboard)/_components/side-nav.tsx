"use client";

/* 桌面左侧竖栏(Codex 式,替代原顶部胶囊导航):
 * [蛋厨] / [新对话] / 聊天 食材库 菜谱 食物笔记 今日营养 …… 设置(贴底)
 * 仅桌面(md+);移动端仍走 HamburgerMenu。
 * 在 DanShots 窗口里(UA 带 "DanShots")顶部多留一截给红黄绿按钮,
 * 并标成 Tauri 拖拽区,隐藏系统标题栏后靠它拖动窗口。 */

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { navItems } from "./hamburger-menu";
import { startNewConversation } from "@/lib/chat/new-conversation";

const MAIN_ORDER = ["/chat", "/kitchen", "/recipes", "/notes", "/nutrition"];
const mainItems = MAIN_ORDER.map((href) => navItems.find((i) => i.href === href)!);
const settingsItem = { ...navItems.find((i) => i.href === "/settings")!, label: "设置" };

export function SideNav() {
  const pathname = usePathname();
  const router = useRouter();
  // UA 不会变,订阅是空操作;服务端渲染时当作不在 DanShots 里
  const inDanShots = useSyncExternalStore(
    () => () => {},
    () => navigator.userAgent.includes("DanShots"),
    () => false
  );

  // 聊天页直接插分隔线;别的页先跳回聊天,由 chat-interface 读 ?new=1 再插
  const onNewConversation = () => {
    if (pathname.startsWith("/chat")) startNewConversation();
    else router.push("/chat?new=1");
  };

  const renderItem = (item: (typeof navItems)[number]) => {
    const active = pathname === item.href || pathname.startsWith(item.href + "/");
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[12.5px] transition-colors ${
          active
            ? "bg-white/80 text-ink font-medium shadow-soft"
            : "text-ink-soft hover:bg-white/50 hover:text-ink"
        }`}
      >
        <span className={`[&_svg]:w-4 [&_svg]:h-4 ${active ? "text-ink" : "text-ink-muted"}`}>
          {item.icon}
        </span>
        {item.label}
      </Link>
    );
  };

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-52 flex-col bg-surface-dim/70 border-r border-pebble/50 pt-[env(safe-area-inset-top)]">
      {/* 顶部:DanShots 里留出红黄绿按钮的高度,整条可拖动窗口 */}
      <div
        data-tauri-drag-region
        className={`shrink-0 flex items-center gap-2 px-4 ${inDanShots ? "pt-10 pb-3" : "py-4"}`}
      >
        <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-butter via-peach to-blush flex items-center justify-center text-[13px] pointer-events-none">🍳</span>
        <span className="font-logo text-[15px] text-ink pointer-events-none">蛋厨</span>
      </div>

      <div className="px-2.5">
        <button
          type="button"
          onClick={onNewConversation}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[12.5px] text-ink-soft hover:bg-white/50 hover:text-ink transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-ink-muted">
            <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
          </svg>
          新对话
        </button>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto px-2.5 pt-3 space-y-0.5">
        {mainItems.map(renderItem)}
      </nav>

      <div className="shrink-0 px-2.5 py-3 border-t border-pebble/50">
        {renderItem(settingsItem)}
      </div>
    </aside>
  );
}
