"use client";

import { logout } from "@/app/(auth)/actions";

/* variant:
 * "menu"(默认)— 移动端抽屉里的整行菜单项
 * "button" — 设置页用的独立危险操作按钮(danger 浅底 pill) */
export function LogoutButton({ variant = "menu" }: { variant?: "menu" | "button" }) {
  if (variant === "button") {
    return (
      <button
        onClick={() => logout()}
        className="rounded-full px-5 py-2.5 text-[12.5px] font-medium text-danger bg-danger/10 hover:bg-danger/15 active:bg-danger/20 transition-colors"
      >
        退出登录
      </button>
    );
  }
  return (
    <button
      onClick={() => logout()}
      className="w-full px-3 py-2 text-left text-[12.5px] text-ink-muted rounded-xl hover:bg-surface-dim hover:text-ink transition-colors"
    >
      退出登录
    </button>
  );
}
