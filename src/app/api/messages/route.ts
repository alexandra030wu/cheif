import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 10;

const PostSchema = z.object({
  role: z.enum(["user", "assistant"]),
  // 必须 trim 后非空。空 content 一旦入库，下一次构造 prompt 时 spread 进
  // Anthropic messages 数组就会触发 400「empty content block」。
  content: z.string().transform((s) => s.trim()).pipe(z.string().min(1)),
  recipes: z.array(z.unknown()).nullable().optional(),
});

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "未登录" }, { status: 401 });

  const url = new URL(request.url);
  const before = url.searchParams.get("before");
  const limitRaw = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(1, limitRaw), MAX_LIMIT)
    : DEFAULT_LIMIT;
  const since = url.searchParams.get("since");

  let query = supabase
    .from("messages")
    .select("id, role, content, recipes, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) query = query.lt("created_at", before);
  if (since) query = query.gte("created_at", since);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // 兜底：过滤掉历史脏数据里 content 为空/空白的行（老 schema 允许空 content
  // 入库）。这些行渲染出来是空气泡，且会污染下次 prompt。assistant 行只要
  // 有 recipes 也保留。
  const cleaned = (data ?? []).filter(
    (m) =>
      (typeof m.content === "string" && m.content.trim().length > 0) ||
      (m.role === "assistant" && Array.isArray(m.recipes) && m.recipes.length > 0)
  );

  // Return ascending so the client renders top-to-bottom in chronological order.
  return Response.json({ messages: cleaned.slice().reverse() });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "未登录" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      user_id: user.id,
      role: parsed.data.role,
      content: parsed.data.content,
      recipes: (parsed.data.recipes ?? null) as never,
    })
    .select("id, role, content, recipes, created_at")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ message: data });
}
