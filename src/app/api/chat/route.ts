import { generateObject, streamText } from "ai";
import { createLanguageModelProvider, resolveProviderConfig } from "@/lib/ai-service/registry";
import {
  ChatResponseSchema,
  normalizeImportedRecipe,
  type Recipe,
} from "@/lib/ai-service/types";
import { buildChatRecipePrompt } from "@/lib/ai-service/prompts/chat-recipe";
import { buildChatReplyPrompt } from "@/lib/ai-service/prompts/chat-reply";
import {
  buildCrystallizePrompt,
  CrystallizeResultSchema,
  CONSENSUS_SIGNAL,
} from "@/lib/ai-service/prompts/crystallize";
import { ChatRequestSchema } from "@/lib/validators/chat";
import { getOrCreateSharedCover } from "@/lib/icon-generation";
import { createClient } from "@/lib/supabase/server";
import { getUserProviderId } from "@/lib/ai-service/user-provider";

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
  const requestId = crypto.randomUUID();
  const body = await request.json();
  const parsed = ChatRequestSchema.safeParse(body);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const errText = issue
      ? `${issue.path.join(".") || "(root)"}: ${issue.message}`
      : "请求参数不合法";
    console.error(
      JSON.stringify({
        tag: "chat_error",
        requestId,
        stage: "validation",
        userId: null,
        err: { name: "ZodError", message: errText, issues: parsed.error.issues },
      })
    );
    return Response.json({ error: errText, requestId }, { status: 400 });
  }

  // Sanitize before passing to prompt builders. Anthropic 400 rejects
  // requests with any empty `content` block in messages; DeepSeek is also
  // unhappy. Both prompt builders spread `input.history` directly, so any
  // empty-content row from earlier failed turns would crash the request.
  const input = {
    ...parsed.data,
    message: parsed.data.message.trim(),
    history: (parsed.data.history ?? []).filter(
      (m) => typeof m.content === "string" && m.content.trim().length > 0
    ),
  };

  if (!input.message) {
    console.error(
      JSON.stringify({
        tag: "chat_error",
        requestId,
        stage: "validation",
        userId: null,
        err: { name: "EmptyMessage", message: "message after trim is empty" },
      })
    );
    return Response.json(
      { error: "消息不能为空", requestId },
      { status: 400 }
    );
  }

  const intent = classifyIntent(input.message);

  // Resolve user once on the server. We persist the assistant message at the
  // end of the stream so it survives the user navigating away mid-stream.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Pick the provider the user chose in /settings (defaults to Claude).
  const providerId = await getUserProviderId(supabase, user?.id);
  const config = resolveProviderConfig({ id: providerId });
  const model = createLanguageModelProvider(config);

  const logCtx = {
    requestId,
    userId: user?.id ?? null,
    intent,
    provider: config.id,
    model: config.model,
    msgLen: input.message.length,
    historyLen: input.history?.length ?? 0,
    ingredientsLen: input.ingredients.length,
    tasteProfilePresent: !!input.tasteProfile,
  };
  const logErr = (
    stage: "stream" | "persist" | "cover",
    err: unknown,
    extra?: Record<string, unknown>
  ) => {
    const e = err instanceof Error ? err : null;
    console.error(
      JSON.stringify({
        tag: "chat_error",
        ...logCtx,
        stage,
        ...extra,
        err: e
          ? { name: e.name, message: e.message, stack: e.stack }
          : { message: String(err) },
      })
    );
  };

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
      logErr("persist", error, { phase: "insert_assistant" });
      return null;
    }
    return data?.id ?? null;
  };

  // 用量埋点：仅累加，不影响主流程。流末尾 best-effort 落库。
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheReadTokens = 0;
  let cacheWriteTokens = 0;
  let coverCount = 0;
  type UsageWithCache = {
    inputTokens?: number;
    outputTokens?: number;
    inputTokenDetails?: {
      cacheReadTokens?: number;
      cacheWriteTokens?: number;
    };
  };
  const addUsage = (u: UsageWithCache | null | undefined) => {
    if (!u) return;
    inputTokens += u.inputTokens ?? 0;
    outputTokens += u.outputTokens ?? 0;
    cacheReadTokens += u.inputTokenDetails?.cacheReadTokens ?? 0;
    cacheWriteTokens += u.inputTokenDetails?.cacheWriteTokens ?? 0;
  };

  // Anthropic prompt caching：传顶层 cacheControl，Anthropic 自动挑最佳
  // 缓存断点（system + 早期 messages 是稳定前缀，刚好被缓存）。
  // - 命中读取 cache 只收 0.1× 价
  // - 写新缓存收 1.25×（5 分钟内连续请求很快回本）
  // DeepSeek 不支持，不传 providerOptions。
  const providerOptions =
    config.id === "anthropic"
      ? { anthropic: { cacheControl: { type: "ephemeral" as const } } }
      : undefined;

  const stream = new ReadableStream({
    async start(controller) {
      let fullText = "";
      let finalRecipes: Recipe[] | null = null;
      let assistantMsgId: string | null = null;

      // 为 recipes 并行生成封面:每张完成即推一个 cover 事件,返回带
      // coverImageUrl 的新数组。chat 定稿路径和 recipe 推荐路径共用。
      const enrichWithCovers = async (recipes: Recipe[]): Promise<Recipe[]> => {
        const updated = recipes.slice();
        await Promise.allSettled(
          recipes.map(async (r, index) => {
            try {
              const coverImageUrl = await getOrCreateSharedCover(r.title);
              if (coverImageUrl) {
                updated[index] = { ...updated[index], coverImageUrl };
                coverCount += 1;
                sseSend(controller, { type: "cover", index, title: r.title, coverImageUrl });
              }
            } catch (err) {
              logErr("cover", err, { recipeTitle: r.title });
            }
          })
        );
        return updated;
      };

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
            providerOptions,
          });

          for await (const chunk of result.textStream) {
            fullText += chunk;
            sseSend(controller, { type: "text", content: chunk });
          }
          // streamText 的 usage 在流结束后才 resolve
          try {
            addUsage(await result.usage);
          } catch (e) {
            logErr("persist", e, { phase: "usage_capture_chat" });
          }

          // ── 定稿成卡:对话收敛出共识时,提取聊定的那一道菜 ──
          // 正则预过滤保证绝大多数闲聊零额外成本;提取失败不影响已送达的
          // 文字回复(非致命,只记日志)。
          if (CONSENSUS_SIGNAL.test(fullText)) {
            try {
              const { system: cSystem, messages: cMessages } =
                buildCrystallizePrompt(input, fullText);
              const { object: cResult, usage: cUsage } = await generateObject({
                model,
                schema: CrystallizeResultSchema,
                system: cSystem,
                messages: cMessages,
                temperature: 0.3,
                maxOutputTokens: 2048,
                providerOptions,
              });
              addUsage(cUsage);
              if (cResult.consensusReached && cResult.recipe?.title) {
                const recipe = normalizeImportedRecipe(cResult.recipe);
                finalRecipes = [recipe];
                sseSend(controller, {
                  type: "recipes",
                  recipes: finalRecipes,
                  crystallized: true,
                });
                assistantMsgId = await persistAssistant(fullText, finalRecipes);
                finalRecipes = await enrichWithCovers(finalRecipes);
              }
            } catch (err) {
              logErr("stream", err, { phase: "crystallize" });
            }
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
            providerOptions,
          });

          for await (const chunk of textResult.textStream) {
            fullText += chunk;
            sseSend(controller, { type: "text", content: chunk });
          }
          try {
            addUsage(await textResult.usage);
          } catch (e) {
            logErr("persist", e, { phase: "usage_capture_recipe_text" });
          }

          // Step 2: Generate structured recipes (takes longer, but user is already reading text)
          const { system: recipeSystem, messages: recipeMessages } = buildChatRecipePrompt(input);
          const { object, usage: recipeUsage } = await generateObject({
            model,
            schema: ChatResponseSchema,
            system: recipeSystem,
            messages: recipeMessages,
            temperature: 0.7,
            maxOutputTokens: 4096,
            providerOptions,
          });
          addUsage(recipeUsage);

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
          finalRecipes = await enrichWithCovers(finalRecipes);
        }
      } catch (err) {
        logErr("stream", err);
        sseSend(controller, {
          type: "error",
          requestId,
          message: err instanceof Error ? err.message : "AI 服务调用失败",
        });
      }

      // Final persist. 三种情况:
      //   - chat 且未定稿:纯文字消息,现在落库
      //   - chat 且定稿 / recipe 推荐:消息已带 recipes 落库,这里补写
      //     cover-enriched 的版本
      if (intent === "chat" && !assistantMsgId) {
        await persistAssistant(fullText, null);
      } else if (assistantMsgId && finalRecipes) {
        const { error } = await supabase
          .from("messages")
          .update({ recipes: finalRecipes as never })
          .eq("id", assistantMsgId);
        if (error) logErr("persist", error, { phase: "update_covers" });
      }

      // 用量埋点落库（best-effort，写失败只记日志不抛错）。流出错时也写一条
      // —— 错误请求往往已经产生 token 消耗，必须计入。
      if (user && (inputTokens > 0 || outputTokens > 0 || coverCount > 0)) {
        const { error } = await supabase.from("usage_logs").insert({
          user_id: user.id,
          request_id: requestId,
          intent,
          provider: config.id,
          model: config.model,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          cover_count: coverCount,
          cache_read_tokens: cacheReadTokens,
          cache_write_tokens: cacheWriteTokens,
        });
        if (error) logErr("persist", error, { phase: "usage_log" });
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
