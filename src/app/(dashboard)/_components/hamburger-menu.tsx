"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "./logout-button";

/* 图标:lucide 线稿风,stroke-width 1.8(DanOS 规范;项目未装 lucide-react 依赖,
 * 手抄 path 内联 svg,风格对齐 recipe-card.tsx 的时钟图标写法) */
const navItems = [
  {
    href: "/chat",
    label: "聊天",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
      </svg>
    ),
  },
  {
    href: "/kitchen",
    label: "食材库",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73Z" />
        <path d="M12 22V12" />
        <path d="M3.29 7 12 12l8.71-5" />
        <path d="m7.5 4.27 9 5.15" />
      </svg>
    ),
  },
  {
    href: "/notes",
    label: "食物笔记",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M2 6h4" /><path d="M2 10h4" /><path d="M2 14h4" /><path d="M2 18h4" />
        <rect width="16" height="20" x="4" y="2" rx="2" />
        <path d="M9.5 8h5" /><path d="M9.5 12H16" /><path d="M9.5 16H14" />
      </svg>
    ),
  },
  {
    href: "/recipes",
    label: "菜谱",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M12 7v14" />
        <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
      </svg>
    ),
  },
  {
    href: "/nutrition",
    label: "今日营养",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "个人设置",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
];

interface Props {
  userEmail: string;
}

export function HamburgerMenu({ userEmail }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  return (
    <>
      {/* Hamburger button — fixed top-left, above content */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed top-[calc(0.75rem+env(safe-area-inset-top,0px))] left-3 z-40 rounded-full p-2 text-ink-muted hover:bg-surface-dim active:bg-pebble transition-colors bg-surface/80 backdrop-blur-sm shadow-soft"
        aria-label="打开菜单"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <line x1="4" x2="20" y1="12" y2="12" />
          <line x1="4" x2="20" y1="6" y2="6" />
          <line x1="4" x2="20" y1="18" y2="18" />
        </svg>
      </button>

      {/* Overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-ink/20 backdrop-blur-[2px] transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-out drawer */}
      <div
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-surface shadow-soft-lg rounded-r-3xl flex flex-col transition-transform duration-200 ease-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 pt-[calc(1rem+env(safe-area-inset-top))] border-b border-pebble/60">
          <div>
            <span className="font-logo text-lg text-ink">DanChef</span>
            <p className="text-[11px] text-ink-muted mt-0.5">智能厨房助手</p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-full p-1.5 text-ink-muted hover:bg-surface-dim transition-colors"
            aria-label="关闭菜单"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 text-[12.5px] rounded-xl transition-colors ${
                  isActive
                    ? "bg-surface-dim text-ink font-medium"
                    : "text-ink-soft hover:bg-surface-dim/60 hover:text-ink"
                }`}
              >
                <span className={isActive ? "text-ink" : "text-ink-muted"}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-pebble/60">
          <p className="px-3 mb-2 text-[11px] text-ink-muted truncate">{userEmail}</p>
          <LogoutButton />
        </div>
      </div>
    </>
  );
}
