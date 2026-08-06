"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type AuthState } from "../actions";

const initialState: AuthState = { status: "idle" };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm space-y-6 rounded-3xl bg-surface p-8 shadow-soft">
        <div className="text-center">
          <h1 className="font-logo text-[22px] text-ink">登录 DanChef</h1>
          <p className="text-[11px] text-ink-muted mt-1">智能厨房助手</p>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-[11px] font-medium text-ink-soft mb-1">
              邮箱
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-xl border border-pebble bg-pebble/30 px-3 py-2 text-[12.5px] text-ink placeholder-ink-muted focus:border-ink/30 focus:bg-surface focus:outline-none focus:ring-1 focus:ring-ink/20 transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-[11px] font-medium text-ink-soft mb-1">
              密码
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              minLength={6}
              className="w-full rounded-xl border border-pebble bg-pebble/30 px-3 py-2 text-[12.5px] text-ink placeholder-ink-muted focus:border-ink/30 focus:bg-surface focus:outline-none focus:ring-1 focus:ring-ink/20 transition-colors"
              placeholder="至少 6 个字符"
            />
          </div>

          {state.status === "error" && (
            <p className="text-[11px] text-danger">{state.message}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-full bg-ink px-4 py-2 text-[12.5px] font-medium text-white hover:bg-ink/90 active:bg-ink/80 transition-colors disabled:opacity-50"
          >
            {pending ? "登录中…" : "登录"}
          </button>
        </form>

        <p className="text-center text-[11px] text-ink-muted">
          还没有账号？{" "}
          <Link href="/signup" className="text-ink underline underline-offset-2">
            注册
          </Link>
        </p>
      </div>
    </div>
  );
}
