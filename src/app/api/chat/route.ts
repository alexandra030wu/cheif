import { generateObject, streamText } from "ai";
import { createLanguageModelProvider, resolveProviderConfig } from "@/lib/ai-service/registry";
import { ChatResponseSchema, type Recipe } from "@/lib/ai-service/types";
import { buildChatRecipePrompt } from "@/lib/ai-service/prompts/chat-recipe";
import { buildChatReplyPrompt } from "@/lib/ai-service/prompts/chat-reply";
import { ChatRequestSchema } from "@/lib/validators/chat";
import { getOrCreateSharedCover } from "@/lib/icon-generation";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

// ── Intent classification ──────────────────────────────────────
// V2 「饮食陪伴」基调：对话为主，菜谱推荐只在用户**明确**要求时出现。
// 之前的关键词（"做"/"吃"/"菜"）覆盖太宽，凡是讨论饮食的句子都误判为
// recipe；现在只匹配明确的"求推荐"信号，且疑问句优先识别为 chat。

const RECIPE_KEYWORDS =
  /推荐|食谱|菜谱|来个|来道|来一道|想吃|饿了|做什么|做啥|做点什么|帮我想|配什么|搭配|早餐|午餐|晚餐|夜宵|加餐|便当|减脂餐|健身餐|快手菜/;

// 疑问句句尾或求建议的句式：用户在问问题 / 想了解，不是要菜谱
const QUESTION_SUFFIX = /[?？]$|吗[?？！。\s]*$|呢[?？！。\s]*$/;

function classifyIntent(message: string): "recipe" | "chat" {
  const trimmed = message.trim();
  if (QUESTION_SUFFIX.test(trimmed)) return "chat";
  if (RECIPE_KEYWORDS.test(trimmed)) return "recipe";
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

  // Resolve user once on the server. We persist the assistant message at the
  // end of the stream so it survives the user navigating away mid-stream.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Persist assistant message at stream end. Tolerant of providers (e.g.
  // DeepSeek V4-Flash) that occasionally emit 0 text chars but still produce
  // a recipes payload — in that case we use a fallback so the message has
  // something to render and isn't lost.
  const persistAssistant = async (
    content: string,
    recipes: Recipe[] | null
  ): Promise<string | null> => {
    if (!user) return null;
    const hasRecipes = !!(recipes && recipes.length > 0);
    if (!content && !hasRecipes) return null;
    const persistedContent = content || "为你推荐了几道菜：";
    const { data, error } = await supabase
      .from("messages")
      .insert({
        user_id: user.id,
        role: "assistant",
        content: persistedContent,
        recipes: (recipes ?? null) as never,
      })
      .select("id")
      .single();
    if (error) {
      console.error("[/api/chat] persist assistant failed:", error.message);
      return null;
    }
    return data?.id ?? null;
  };

  const stream = new ReadableStream({
    async start(controller) {
      let fullText = "";
      let finalRecipes: Recipe[] | null = null;
      let assistantMsgId: string | null = null;
      try {
        if (intent === "chat") {
          // ── Chat intent: stream text only ──
          const { system, messages } = buildChatReplyPrompt(input);
          const result = streamText({
            model,
            system,
            messages,
            temperature: 0.7,
            maxOutputTokens: 512,
          });

          for await (const chunk of result.textStream) {
            fullText += chunk;
            sseSend(controller, { type: "text", content: chunk });
          }
        } else {
          // ── Recipe intent: stream reply text, then generate recipes ──

          // Step 1: Stream a conversational reply first (fast, user sees text immediately)
          const { system: chatSystem, messages: chatMessages } = buildChatReplyPrompt(input);
          const textResult = streamText({
            model,
            system: chatSystem + "\n\n注意：用户想要菜谱推荐，请简短回复1-2句话表示你在为他准备菜谱，不要给出具体菜谱内容。",
            messages: chatMessages,
            temperature: 0.7,
            maxOutputTokens: 150,
          });

          for await (const chunk of textResult.textStream) {
            fullText += chunk;
            sseSend(controller, { type: "text", content: chunk });
          }

          // Step 2: Generate structured recipes (takes longer, but user is already reading text)
          const { system: recipeSystem, messages: recipeMessages } = buildChatRecipePrompt(input);
          const { object } = await generateObject({
            model,
            schema: ChatResponseSchema,
            system: recipeSystem,
            messages: recipeMessages,
            temperature: 0.7,
            maxOutputTokens: 4096,
          });

          finalRecipes = object.recipes as Recipe[];
          sseSend(controller, { type: "recipes", recipes: object.recipes });

          // Persist the assistant message NOW (with text + recipes, no covers
          // yet). Covers come later via Promise.allSettled and might not all
          // resolve before the client navigates away. The recipes themselves
          // are already enough — covers backfill on next view via shared
          // library cache lookup, which is near-instant.
          assistantMsgId = await persistAssistant(fullText, finalRecipes);

          // Step 3: Generate cover images in parallel and stream per-recipe cover events
          // as each completes. Recipes already render on the client; covers fade in.
          // We also opportunistically PATCH the just-inserted message with covers
          // so future page loads don't have to re-fetch covers (saves a round-trip).
          const updatedRecipes: Recipe[] = object.recipes.slice() as Recipe[];
          await Promise.allSettled(
            object.recipes.map(async (r, index) => {
              try {
                const coverImageUrl = await getOrCreateSharedCover(r.title);
                if (coverImageUrl) {
                  updatedRecipes[index] = { ...updatedRecipes[index], coverImageUrl };
                  sseSend(controller, { type: "cover", index, title: r.title, coverImageUrl });
                }
              } catch (err) {
                console.warn("[/api/chat] cover generation failed for", r.title, err);
              }
            })
          );
          finalRecipes = updatedRecipes;
        }
      } catch (err) {
        console.error("[/api/chat] STREAM ERROR:", err);
        sseSend(controller, {
          type: "error",
          message: err instanceof Error ? err.message : "AI 服务调用失败",
        });
      }

      // Final persist for chat-intent (recipe-intent persisted earlier; we
      // update with the cover-enriched recipes for completeness).
      if (intent === "chat") {
        await persistAssistant(fullText, null);
      } else if (assistantMsgId && finalRecipes) {
        const { error } = await supabase
          .from("messages")
          .update({ recipes: finalRecipes as never })
          .eq("id", assistantMsgId);
        if (error) console.error("[/api/chat] update covers failed:", error.message);
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
