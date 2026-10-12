import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const publicPaths = ["/login", "/signup", "/callback"];

export async function proxy(request: NextRequest) {
  // /api/danos 走自己的 Bearer token 鉴权(见 api/danos/recipes/route.ts),
  // 调用方是桌面端 DanOS,没有浏览器 cookie。不查 session、不重定向,
  // 直接放行到 route handler 里做 token 校验。
  if (request.nextUrl.pathname.startsWith("/api/danos")) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));

  // Unauthenticated users trying to access protected routes → /login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Authenticated users on auth pages → /kitchen
  if (user && isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/chat";
    return NextResponse.redirect(url);
  }

  return response;
}

// public/ 下的静态文件(sw.js、manifest.json、图标)也要排除:之前它们未登录时被
// 307 到 /login,service worker 注册永远失败(被 sw-register 的空 catch 吞掉),
// PWA manifest 和 apple-touch-icon 也拿到的是登录页 HTML。
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|sw\\.js|manifest\\.json|.*\\.(?:png|svg|ico|jpg|jpeg|webp)$).*)",
  ],
};
