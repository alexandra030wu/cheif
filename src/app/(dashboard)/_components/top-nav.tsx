"use client";

/* 桌面顶部导航(v3,按用户设计指令):
 * 一枚与对话内容同宽(max-w-3xl)的毛玻璃胶囊条,居中;
 * [蛋厨 logo] [聊天 食材库 菜谱 食物笔记 今日营养 设置(文字项)] …… [退出]
 * 仅桌面(md+);移动端仍走 HamburgerMenu。 */

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/chat", label: "聊天" },
  { href: "/kitchen", label: "食材库" },
  { href: "/recipes", label: "菜谱" },
  { href: "/notes", label: "食物笔记" },
  { href: "/nutrition", label: "今日营养" },
  { href: "/settings", label: "设置" },
];

export function TopNav(_props: { userEmail: string }) {
  const pathname = usePathname();
  return (
    <header className="hidden md:block sticky top-0 z-40">
      {/* 整条磨砂过渡:滚到胶囊下的内容被模糊并向下渐隐(iOS 顶栏质感)。
          渐变规格与输入框上缘的过渡层保持一致(blur-md + canvas/70 + 55% 起渐隐) */}
      <div className="absolute inset-x-0 top-0 -bottom-7 backdrop-blur-md bg-canvas/70 [mask-image:linear-gradient(to_bottom,black_55%,transparent)] pointer-events-none" />
      <div className="relative px-5 pt-1.5 pb-2">
      <div className="mx-auto w-full max-w-3xl glass-frosted rounded-full shadow-soft grid grid-cols-[1fr_auto_1fr] items-center gap-3 pl-3 pr-3 py-1.5">
        {/* logo 位:squircle 图标(将来换正式 logo)+ 字标 */}
        <Link href="/chat" className="flex items-center gap-2 shrink-0">
          <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-butter via-peach to-blush flex items-center justify-center text-[13px]">🍳</span>
          <span className="font-logo text-[15px] text-ink">蛋厨</span>
        </Link>
        <nav className="min-w-0 flex items-center justify-center gap-1 whitespace-nowrap">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 whitespace-nowrap px-3.5 py-1.5 rounded-full text-[12.5px] transition ${
                  active
                    ? "bg-ink text-white font-medium"
                    : "text-ink-soft hover:bg-white/70 hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <span aria-hidden className="justify-self-end" />
      </div>
      </div>
    </header>
  );
}
