import { generateObject } from "ai";
import { z } from "zod";
import { createLanguageModelProvider, resolveProviderConfig } from "@/lib/ai-service/registry";
import { ImportedRecipeSchema } from "@/lib/ai-service/types";
import { createClient } from "@/lib/supabase/server";
import { getUserProviderId } from "@/lib/ai-service/user-provider";
import {
  buildImageExtractionPrompt,
  buildTextExtractionPrompt,
} from "@/lib/ai-service/prompts/recipe-import";

export const runtime = "nodejs";
export const maxDuration = 60;

const ImageBody = z.object({
  mode: z.literal("image"),
  imageBase64: z.string().min(100),
  mimeType: z.string().optional(),
});

const TextBody = z.object({
  mode: z.literal("text"),
  text: z.string().min(20).max(8000),
});

const BodySchema = z.discriminatedUnion("mode", [ImageBody, TextBody]);

export async function POST(request: Request) {
  const raw = await request.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(raw);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let providerId = await getUserProviderId(supabase, user?.id);

  // Image mode needs a vision-capable provider. DeepSeek V4 / Ollama can't do
  // vision, so transparently fall back to Claude for image OCR regardless of
  // the user's chat preference — they still get the import, just powered by a
  // model that can actually read the screenshot.
  if (parsed.data.mode === "image" && (providerId === "deepseek" || providerId === "ollama")) {
    providerId = "anthropic";
  }

  const config = resolveProviderConfig({ id: providerId });
  const model = createLanguageModelProvider(config);

  try {
    if (parsed.data.mode === "image") {
      const mimeType = parsed.data.mimeType || "image/jpeg";
      // AI SDK wants raw bytes for images — data: URLs get rejected with
      // "URL scheme must be http or https". Buffer.from(base64) gives us bytes.
      const imageBytes = Buffer.from(parsed.data.imageBase64, "base64");
      const { object } = await generateObject({
        model,
        schema: ImportedRecipeSchema,
        temperature: 0.2,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                image: imageBytes,
                mediaType: mimeType,
              },
              { type: "text", text: buildImageExtractionPrompt() },
            ],
          },
        ],
      });
      return Response.json({ recipe: object });
    }

    const { object } = await generateObject({
      model,
      schema: ImportedRecipeSchema,
      temperature: 0.2,
      prompt: buildTextExtractionPrompt(parsed.data.text),
    });
    return Response.json({ recipe: object });
  } catch (err) {
    console.error("[/api/recipes/import] extraction failed:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "提取失败" },
      { status: 500 }
    );
  }
}
