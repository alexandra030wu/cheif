import { createAIService } from "@/lib/ai-service";
import type { FatLossTargets } from "@/lib/ai-service/types";
import { RecipeGenerationRequestSchema } from "@/lib/validators/recipe";
import { createClient } from "@/lib/supabase/server";
import { getUserProviderId } from "@/lib/ai-service/user-provider";

export const maxDuration = 60;

// 请求未显式传 fatLoss 时，回落到用户 profile 的减脂模式设置
async function resolveFatLoss(
  explicit: FatLossTargets | undefined
): Promise<FatLossTargets | undefined> {
  if (explicit) return explicit;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return undefined;

    const { data: profile } = await supabase
      .from("profiles")
      .select("fat_loss_mode, daily_calorie_target, daily_protein_target_g")
      .eq("id", user.id)
      .single();

    if (!profile?.fat_loss_mode) return undefined;
    return {
      enabled: true,
      dailyCalorieTarget: profile.daily_calorie_target ?? undefined,
      dailyProteinTargetG: profile.daily_protein_target_g ?? undefined,
    };
  } catch {
    return undefined;
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = RecipeGenerationRequestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const providerId = await getUserProviderId(supabase, user?.id);
    const fatLoss = await resolveFatLoss(parsed.data.fatLoss);
    const service = createAIService({ id: providerId });
    const stream = await service.streamRecipe({ ...parsed.data, fatLoss });
    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "AI 服务调用失败";
    return Response.json({ error: message }, { status: 502 });
  }
}
