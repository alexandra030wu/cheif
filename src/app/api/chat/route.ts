import { getAIService } from "@/lib/ai-service";
import { ChatRequestSchema } from "@/lib/validators/chat";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = ChatRequestSchema.safeParse(body);

  if (!parsed.success) {
    console.error("[/api/chat] VALIDATION FAILED:", JSON.stringify(parsed.error.flatten(), null, 2));
    console.error("[/api/chat] REQUEST BODY:", JSON.stringify(body, null, 2).slice(0, 1000));
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const service = getAIService();
    const result = await service.generateChatRecipes(parsed.data);
    return Response.json(result);
  } catch (err: unknown) {
    console.error("[/api/chat] ERROR:", err);
    const message =
      err instanceof Error ? err.message : "AI 服务调用失败";
    return Response.json({ error: message }, { status: 502 });
  }
}
