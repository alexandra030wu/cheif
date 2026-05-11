import { createClient } from "@/lib/supabase/server";

// 第一阶段「只测量」的查询端：返回当月聚合（总 input/output tokens、封面
// 张数、对话/菜谱次数），供 UI 顶部 chip 和详情 sheet 展示。
//
// 暂不返回 30 日趋势；等用户量真正上来再加（避免一开始就过设计）。

export const maxDuration = 10;

interface MonthUsage {
  inputTokens: number;
  outputTokens: number;
  coverCount: number;
  requestCount: number;
  chatCount: number;
  recipeCount: number;
}

const ZERO: MonthUsage = {
  inputTokens: 0,
  outputTokens: 0,
  coverCount: 0,
  requestCount: 0,
  chatCount: 0,
  recipeCount: 0,
};

function monthStartIso(): string {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "未登录" }, { status: 401 });

  const { data, error } = await supabase
    .from("usage_logs")
    .select("input_tokens, output_tokens, cover_count, intent")
    .eq("user_id", user.id)
    .gte("created_at", monthStartIso());

  if (error) {
    console.error(
      JSON.stringify({ tag: "usage_query_error", userId: user.id, message: error.message })
    );
    return Response.json({ error: error.message }, { status: 500 });
  }

  const month: MonthUsage = (data ?? []).reduce<MonthUsage>(
    (acc, r) => ({
      inputTokens: acc.inputTokens + (r.input_tokens ?? 0),
      outputTokens: acc.outputTokens + (r.output_tokens ?? 0),
      coverCount: acc.coverCount + (r.cover_count ?? 0),
      requestCount: acc.requestCount + 1,
      chatCount: acc.chatCount + (r.intent === "chat" ? 1 : 0),
      recipeCount: acc.recipeCount + (r.intent === "recipe" ? 1 : 0),
    }),
    ZERO
  );

  return Response.json({ month });
}
