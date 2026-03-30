import { getAIService } from "@/lib/ai-service";
import { z } from "zod";

const AnalyzeRequestSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = AnalyzeRequestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const service = getAIService();
  const result = await service.analyzeIngredient(parsed.data);

  return Response.json(result);
}
