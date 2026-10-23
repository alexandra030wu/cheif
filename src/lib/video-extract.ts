// anytocopy.com Open API 客户端 — 抖音等平台视频 → 语音文稿；小红书图文 → 图片文字
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

// ── 图文笔记 → 图片 OCR（小红书等）────────────────────────────
// 传作品链接，一次拿到标题、正文和每张图上的文字。专业版额度不限量，
// 但单用户并发上限 2。视频笔记也会成功，只是 dataList 里只有一张封面。

export async function submitImageOcrTask(workUrl: string): Promise<string> {
  const res = await fetch(`${baseUrl()}/image/ocr/doTask`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ type: "workUrl", workUrl }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`图片识别服务异常（HTTP ${res.status}）`);

  const payload = await res.json();
  if (payload?.code !== 200) {
    throw new Error(payload?.msg || "提交图片识别任务失败");
  }
  if (typeof payload.data !== "string" || !payload.data) {
    throw new Error("图片识别服务未返回任务 ID");
  }
  return payload.data;
}

export interface ImageOcrResult {
  status: "pending" | "success";
  title?: string;
  /** 作品正文 */
  caption?: string;
  /** 每张图识别出的文字，按图片顺序；处理中时只含已完成的图 */
  imageTexts: string[];
  /** 作品总图数（视频笔记通常只有封面 1 张） */
  imageCount: number;
}

export async function queryImageOcrTask(taskId: string): Promise<ImageOcrResult> {
  const params = new URLSearchParams({ taskId });
  const res = await fetch(`${baseUrl()}/image/ocr/queryTask?${params}`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`图片识别服务异常（HTTP ${res.status}）`);

  const payload = await res.json();
  if (payload?.code !== 200) {
    throw new Error(payload?.msg || "查询图片识别任务失败");
  }

  const data = payload.data ?? {};
  const list: Array<{ content?: unknown }> = Array.isArray(data.dataList) ? data.dataList : [];
  return {
    // 文档：1 处理中，2 已完成
    status: Number(data.status) === 2 ? "success" : "pending",
    title: typeof data.title === "string" ? data.title : "",
    caption: typeof data.content === "string" ? data.content : "",
    imageTexts: list
      .map((item) => (typeof item.content === "string" ? item.content.trim() : ""))
      .filter(Boolean),
    imageCount: list.length,
  };
}
