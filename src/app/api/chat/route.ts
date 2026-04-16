import { generateObject, streamText } from "ai";
import { createLanguageModelProvider, resolveProviderConfig } from "@/lib/ai-service/registry";
import { ChatResponseSchema } from "@/lib/ai-service/types";
import { buildChatRecipePrompt } from "@/lib/ai-service/prompts/chat-recipe";
import { buildChatReplyPrompt } from "@/lib/ai-service/prompts/chat-reply";
import { ChatRequestSchema } from "@/lib/validators/chat";
import { getOrCreateSharedCover } from "@/lib/icon-generation";

export const maxDuration = 60;

// ── Intent classification ──────────────────────────────────────

const RECIPE_KEYWORDS =
  /做|吃|菜|煮|炒|蒸|烤|炖|煎|烧|推荐|食谱|菜谱|配什么|来点|来个|来道|想喝|夜宵|早餐|午餐|晚餐|加餐|下饭|快手|减脂餐|健身餐|便当|饿了|想吃/;

function classifyIntent(message: string): "recipe" | "chat" {
  if (RECIPE_KEYWORDS.test(message)) return "recipe";
  return "chat";
}

// ── SSE helpers ────────────────────────────────────────────────

function sseEncode(data: string): Uint8Array {
  return new TextEncoder().encode(`data: ${data}\n\n`);
}

function sseSend(controller: ReadableStreamDefaultController, payload: unknown) {
  controller.enqueue(sseEncode(JSON.stringify(payload)));
}

function sseDone(controller: ReadableStreamDefaultController) {
  controller.enqueue(sseEncode("[DONE]"));
  controller.close();
}

// ── Route handler ──────────────────────────────────────────────

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = ChatRequestSchema.safeParse(body);

  if (!parsed.success) {
    console.error("[/api/chat] VALIDATION FAILED:", JSON.stringify(parsed.error.flatten(), null, 2));
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;
  const intent = classifyIntent(input.message);
  const config = resolveProviderConfig();
  const model = createLanguageModelProvider(config);

  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (intent === "chat") {
          // ── Chat intent: stream text only ──
          const { system, prompt } = buildChatReplyPrompt(input);
          const result = streamText({
            model,
            system,
            prompt,
            temperature: 0.7,
            maxOutputTokens: 512,
          });

          for await (const chunk of result.textStream) {
            sseSend(controller, { type: "text", content: chunk });
          }
        } else {
          // ── Recipe intent: stream reply text, then generate recipes ──

          // Step 1: Stream a conversational reply first (fast, user sees text immediately)
          const { system: chatSystem, prompt: chatPrompt } = buildChatReplyPrompt(input);
          const textResult = streamText({
            model,
            system: chatSystem + "\n\n注意：用户想要菜谱推荐，请简短回复1-2句话表示你在为他准备菜谱，不要给出具体菜谱内容。",
            prompt: chatPrompt,
            temperature: 0.7,
            maxOutputTokens: 150,
          });

          for await (const chunk of textResult.textStream) {
            sseSend(controller, { type: "text", content: chunk });
          }

          // Step 2: Generate structured recipes (takes longer, but user is already reading text)
          const { object } = await generateObject({
            model,
            schema: ChatResponseSchema,
            prompt: buildChatRecipePrompt(input),
            temperature: 0.7,
            maxOutputTokens: 4096,
          });

          sseSend(controller, { type: "recipes", recipes: object.recipes });

          // Step 3: Generate cover images in parallel and stream per-recipe cover events
          // as each completes. Recipes already render on the client; covers fade in.
          await Promise.allSettled(
            object.recipes.map(async (r, index) => {
              try {
                const coverImageUrl = await getOrCreateSharedCover(r.title);
                if (coverImageUrl) {
                  sseSend(controller, { type: "cover", index, title: r.title, coverImageUrl });
                }
              } catch (err) {
                console.warn("[/api/chat] cover generation failed for", r.title, err);
              }
            })
          );
        }
      } catch (err) {
        console.error("[/api/chat] STREAM ERROR:", err);
        sseSend(controller, {
          type: "error",
          message: err instanceof Error ? err.message : "AI 服务调用失败",
        });
      }

      sseDone(controller);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
