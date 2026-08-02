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

    // 文稿提取是低创造性任务,速度优先:8000 字长文稿(视频转写)+ Sonnet
    // 输出完整菜谱会顶穿 Vercel Hobby 60s 上限(实测小高姐法棍视频超时被
    // 杀)。Anthropic 换 Haiku 提取,快 3-5×,提取质量足够;DeepSeek
    // V4-Flash 本来就快,不动。maxOutputTokens 兜底防 runaway。
    const textConfig =
      config.id === "anthropic"
        ? { ...config, model: "claude-haiku-4-5" }
        : config;
    const textModel = createLanguageModelProvider(textConfig);
    const { object } = await generateObject({
      model: textModel,
      schema: ImportedRecipeSchema,
      temperature: 0.2,
      maxOutputTokens: 4096,
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
