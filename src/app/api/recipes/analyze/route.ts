import { createAIService } from "@/lib/ai-service";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUserProviderId } from "@/lib/ai-service/user-provider";

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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const providerId = await getUserProviderId(supabase, user?.id);
  const service = createAIService({ id: providerId });
  const result = await service.analyzeIngredient(parsed.data);

  return Response.json(result);
}
