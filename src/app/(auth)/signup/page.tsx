"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup, type AuthState } from "../actions";

const initialState: AuthState = { status: "idle" };

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">注册 DanChef</h1>
          <p className="text-sm text-gray-400 mt-1">创建你的厨房账号</p>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              邮箱
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              密码
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              minLength={6}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              placeholder="至少 6 个字符"
            />
          </div>

          {state.status === "error" && (
            <p className="text-sm text-red-500">{state.message}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {pending ? "注册中…" : "注册"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          已有账号？{" "}
          <Link href="/login" className="text-gray-900 underline underline-offset-2">
            登录
          </Link>
        </p>
      </div>
    </div>
  );
}
