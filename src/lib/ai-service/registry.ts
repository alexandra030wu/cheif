import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createDeepSeek } from "@ai-sdk/deepseek";
import type { AIProviderConfig, AIProviderID } from "./types";

function buildProxiedFetch() {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (!proxyUrl) return undefined;

  // Skip proxy on serverless platforms (Vercel/AWS Lambda) where localhost proxies don't exist
  if (proxyUrl.includes("127.0.0.1") || proxyUrl.includes("localhost")) {
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      return undefined;
    }
  }

  try {
    // undici ProxyAgent lets Node.js native fetch tunnel through an HTTP/SOCKS proxy
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ProxyAgent, fetch: undiciFetch } = require("undici") as typeof import("undici");
    const dispatcher = new ProxyAgent(proxyUrl);
    return (input: RequestInfo | URL, init?: RequestInit) =>
      undiciFetch(input as Parameters<typeof undiciFetch>[0], {
        ...(init as Parameters<typeof undiciFetch>[1]),
        dispatcher,
      }) as unknown as Promise<Response>;
  } catch {
    // If undici is unavailable, fall back to native fetch
    return undefined;
  }
}

export function createLanguageModelProvider(config: AIProviderConfig) {
  switch (config.id) {
    case "openai": {
      const openai = createOpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
      return openai(config.model);
    }
    case "anthropic": {
      // Hardcode baseURL so the SDK ignores any ANTHROPIC_BASE_URL env that
      // points at "https://api.anthropic.com" without "/v1" (a common Claude
      // Code CLI config that breaks the SDK's URL construction).
      const anthropic = createAnthropic({
        apiKey: config.apiKey,
        baseURL: "https://api.anthropic.com/v1",
        fetch: buildProxiedFetch(),
      });
      return anthropic(config.model);
    }
    case "deepseek": {
      // Use @ai-sdk/deepseek (dedicated provider) instead of openai.chat() —
      // it handles DeepSeek's structured-output quirks (json_object instead
      // of json_schema response_format) automatically. V4 docs:
      // https://api-docs.deepseek.com/news/news260424
      const deepseek = createDeepSeek({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
        fetch: buildProxiedFetch(),
      });
      return deepseek(config.model);
    }
    case "ollama": {
      // Ollama exposes an OpenAI-compatible API
      const ollama = createOpenAI({
        apiKey: "ollama",
        baseURL: config.baseURL ?? "http://localhost:11434/v1",
      });
      return ollama(config.model);
    }
    default:
      throw new Error(`Unknown AI provider: ${config.id}`);
  }
}

export function resolveProviderConfig(
  overrides?: Partial<AIProviderConfig>
): AIProviderConfig {
  const id = (overrides?.id ??
    process.env.AI_PROVIDER ??
    "openai") as AIProviderID;

  const defaults: Record<AIProviderID, Omit<AIProviderConfig, "id">> = {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: "gpt-4o",
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: "claude-sonnet-4-6",
    },
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY,
      // V4-Flash by default — V4-Pro takes 60-70s on structured outputs
      // (full recipe schema), which exceeds Vercel's 60s function timeout
      // and triggers connection resets. Flash is ~5-10x faster and quality
      // is sufficient for chat/recipe tasks. Pro can be used later when
      // we add per-user model selection in /settings.
      // Old deepseek-chat / deepseek-reasoner retire 2026-07-24.
      model: "deepseek-v4-flash",
      baseURL: process.env.DEEPSEEK_BASE_URL,
    },
    ollama: {
      model: "llama3",
      baseURL: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
    },
  };

  return { id, ...defaults[id], ...overrides };
}
