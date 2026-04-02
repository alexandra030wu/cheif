import { getAIService } from "@/lib/ai-service";
import { RecipeGenerationRequestSchema } from "@/lib/validators/recipe";

export const maxDuration = 60;

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = RecipeGenerationRequestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const service = getAIService();
    const stream = await service.streamRecipe(parsed.data);
    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "AI 服务调用失败";
    return Response.json({ error: message }, { status: 502 });
  }
}
