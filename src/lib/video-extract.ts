// anytocopy.com Open API 客户端 — 抖音等平台视频 → 语音文稿
// 凭证仅在服务端使用，勿在客户端代码中引用本模块

const DEFAULT_BASE_URL = "https://api.anytocopy.com/vip/open-api/v1";

function baseUrl(): string {
  return (process.env.ANYTOCOPY_OPEN_API_BASE ?? DEFAULT_BASE_URL).replace(/\/$/, "");
}

function authHeaders(): Record<string, string> {
  const key = process.env.ANYTOCOPY_API_KEY?.trim();
  const secret = process.env.ANYTOCOPY_API_SECRET?.trim();
  if (!key || !secret) {
    throw new Error("缺少 ANYTOCOPY_API_KEY / ANYTOCOPY_API_SECRET 环境变量");
  }
  return { "X-API-Key": key, "X-API-Secret": secret };
}

export async function submitVideoExtractTask(workUrl: string): Promise<string> {
  const params = new URLSearchParams({ workUrl, taskType: "TEXT" });
  const res = await fetch(`${baseUrl()}/video/extract?${params}`, {
    method: "POST",
    headers: authHeaders(),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`视频提取服务异常（HTTP ${res.status}）`);

  const payload = await res.json();
  if (payload?.code !== 200) {
    throw new Error(payload?.msg || "提交视频提取任务失败");
  }

  const data = payload.data;
  const taskId =
    typeof data === "string" ? data : data?.taskId ?? data?.id ?? null;
  if (!taskId) throw new Error("视频提取服务未返回任务 ID");
  return String(taskId);
}

export interface VideoExtractResult {
  status: "pending" | "success" | "failed";
  /** 语音转写的正式文稿 */
  transcript?: string;
  /** 作品标题文案 */
  caption?: string;
  error?: string;
}

export async function queryVideoExtractTask(taskId: string): Promise<VideoExtractResult> {
  const params = new URLSearchParams({ taskId });
  const res = await fetch(`${baseUrl()}/video/query?${params}`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`视频提取服务异常（HTTP ${res.status}）`);

  const payload = await res.json();
  if (payload?.code !== 200) {
    throw new Error(payload?.msg || "查询视频提取任务失败");
  }

  const data = payload.data ?? {};
  const status = String(data.status ?? "").toUpperCase();

  if (status === "SUCCESS") {
    return {
      status: "success",
      transcript: typeof data.textContent === "string" ? data.textContent : "",
      caption: typeof data.content === "string" ? data.content : "",
    };
  }
  if (status === "FAILED" || status === "FAILURE") {
    return { status: "failed", error: data.errorMessage || "视频提取失败" };
  }
  return { status: "pending" };
}
