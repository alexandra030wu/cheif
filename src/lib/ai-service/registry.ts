import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { AIProviderConfig, AIProviderID } from "./types";

function buildProxiedFetch() {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (!proxyUrl) return undefined;
  // undici ProxyAgent lets Node.js native fetch tunnel through an HTTP/SOCKS proxy
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ProxyAgent, fetch: undiciFetch } = require("undici") as typeof import("undici");
  const dispatcher = new ProxyAgent(proxyUrl);
  return (input: RequestInfo | URL, init?: RequestInit) =>
    undiciFetch(input as Parameters<typeof undiciFetch>[0], {
      ...(init as Parameters<typeof undiciFetch>[1]),
      dispatcher,
    }) as unknown as Promise<Response>;
}

export function createLanguageModelProvider(config: AIProviderConfig) {
  switch (config.id) {
    case "openai": {
      const openai = createOpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
      return openai(config.model);
    }
    case "anthropic": {
      const anthropic = createAnthropic({
        apiKey: config.apiKey,
        fetch: buildProxiedFetch(),
      });
      return anthropic(config.model);
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
      model: "claude-sonnet-4-20250514",
    },
    ollama: {
      model: "llama3",
      baseURL: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
    },
  };

  return { id, ...defaults[id], ...overrides };
}
