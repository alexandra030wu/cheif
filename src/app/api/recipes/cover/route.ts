import { z } from "zod";
import { getOrCreateSharedCover } from "@/lib/icon-generation";

const BodySchema = z.object({
  title: z.string().min(1).max(100),
});

export const maxDuration = 30;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const coverImageUrl = await getOrCreateSharedCover(parsed.data.title);
  return Response.json({ coverImageUrl });
}
