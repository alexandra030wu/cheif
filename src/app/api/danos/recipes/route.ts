import { createAdminClient } from "@/lib/supabase/admin";
import type { Recipe } from "@/lib/ai-service";

// ── DanOS 集成端点:拉取最近聊出来的菜谱卡 ──
//
// DanOS(桌面端 Tauri app)的 RecipeCardsWidget 定时拉这个接口,把最近
// 的菜谱渲染成 Bento 原生卡。桌面端没有浏览器 cookie 会话,走 Bearer
// token(个人使用场景,token 即身份):
//
//   Authorization: Bearer <DANOS_API_TOKEN>
//
// env(需在 Vercel 配置,见 CLAUDE.md):
//   DANOS_API_TOKEN — 随机长串,与 DanOS ~/.danshots/config.json 中一致
//   DANOS_USER_ID   — token 对应的 Supabase user id(你自己账号的 uuid)
//
// 安全边界:admin client 绕 RLS,但查询硬编码只取 DANOS_USER_ID 一个人的
// 数据;token 不匹配直接 401。多用户化之前这个模型够用。

export const maxDuration = 10;

const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 24;

export async function GET(request: Request) {
  const token = process.env.DANOS_API_TOKEN;
  const userId = process.env.DANOS_USER_ID;
  if (!token || !userId) {
    return Response.json({ error: "DanOS 集成未配置" }, { status: 503 });
  }

  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${token}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(1, limitRaw), MAX_LIMIT)
    : DEFAULT_LIMIT;

  const admin = createAdminClient();
  // 最近 30 天带 recipes 的 assistant 消息,展开成卡片列表
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const { data, error } = await admin
    .from("messages")
    .select("id, recipes, created_at")
    .eq("user_id", userId)
    .eq("role", "assistant")
    .not("recipes", "is", null)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(limit * 2); // 一条消息可能带多张卡,多取一些再截断

  if (error) {
    console.error(
      JSON.stringify({ tag: "danos_recipes_error", message: error.message })
    );
    return Response.json({ error: error.message }, { status: 500 });
  }

  const cards = (data ?? [])
    .flatMap((m) => {
      const recipes = Array.isArray(m.recipes)
        ? (m.recipes as unknown as Recipe[])
        : [];
      return recipes.map((r) => ({
        title: r.title,
        description: r.description ?? "",
        coverImageUrl: r.coverImageUrl ?? null,
        totalMinutes: (r.prepTimeMinutes ?? 0) + (r.cookTimeMinutes ?? 0),
        difficulty: r.difficulty ?? "medium",
        servings: r.servings ?? 2,
        cuisine: r.cuisine ?? "",
        ingredients: (r.ingredients ?? []).map((i) => i.name),
        createdAt: m.created_at,
        messageId: m.id,
      }));
    })
    .slice(0, limit);

  return Response.json({ cards });
}
