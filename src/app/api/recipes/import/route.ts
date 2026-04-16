import { generateObject } from "ai";
import { z } from "zod";
import { createLanguageModelProvider, resolveProviderConfig } from "@/lib/ai-service/registry";
import { ImportedRecipeSchema } from "@/lib/ai-service/types";
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

  const config = resolveProviderConfig();

  // Ollama doesn't support vision — fail fast with a clear message
  if (parsed.data.mode === "image" && config.id === "ollama") {
    return Response.json(
      { error: "当前 AI provider 不支持视觉输入，请切换到 openai 或 anthropic，或使用文字粘贴模式" },
      { status: 400 }
    );
  }

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
