import { z } from "zod";
import { getOrCreateSharedCover } from "@/lib/icon-generation";

const BodySchema = z.object({
  title: z.string().min(1).max(100),
  // LLM 随菜谱生成的英文摄影描述,喂 Imagen 出更准的封面(可选,老客户端不传)
  coverImageDescription: z.string().max(500).optional(),
});

// Node runtime required: uses node:crypto + Buffer + Supabase admin client.
// 60s covers cold-start Imagen calls on Vercel Hobby tier (max allowed).
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const coverImageUrl = await getOrCreateSharedCover(
    parsed.data.title,
    parsed.data.coverImageDescription
  );
  return Response.json({ coverImageUrl });
}
