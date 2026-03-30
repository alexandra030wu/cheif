"use client";

import { logout } from "@/app/(auth)/actions";

export function LogoutButton() {
  return (
    <button
      onClick={() => logout()}
      className="w-full px-3 py-2 text-left text-sm text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors"
    >
      退出登录
    </button>
  );
}
