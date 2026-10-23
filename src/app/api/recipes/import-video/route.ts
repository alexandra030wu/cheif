import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  submitVideoExtractTask,
  queryVideoExtractTask,
  submitImageOcrTask,
  queryImageOcrTask,
} from "@/lib/video-extract";

export const runtime = "nodejs";
export const maxDuration = 30;

const SubmitBody = z.object({
  // 允许直接粘贴抖音 App 的整段分享文字，服务端负责抽出链接
  url: z.string().min(10).max(2000),
  // video：语音转写（默认）；note：图文笔记的图片 OCR
  kind: z.enum(["video", "note"]).optional(),
});

const URL_PATTERN = /https?:\/\/[^\s，。！,!]+/;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return Response.json({ error: "未登录" }, { status: 401 });
  }

  const raw = await request.json().catch(() => ({}));
  const parsed = SubmitBody.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const match = parsed.data.url.match(URL_PATTERN);
  if (!match) {
    return Response.json(
      { error: "没有找到链接，请粘贴抖音或小红书分享的完整文字或链接" },
      { status: 400 }
    );
  }

  try {
    const taskId =
      parsed.data.kind === "note"
        ? await submitImageOcrTask(match[0])
        : await submitVideoExtractTask(match[0]);
    return Response.json({ taskId });
  } catch (err) {
    console.error("[/api/recipes/import-video] submit failed:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "提交失败" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) {
    return Response.json({ error: "未登录" }, { status: 401 });
  }

  const searchParams = new URL(request.url).searchParams;
  const taskId = searchParams.get("taskId");
  if (!taskId) {
    return Response.json({ error: "缺少 taskId" }, { status: 400 });
  }

  try {
    const result =
      searchParams.get("kind") === "note"
        ? await queryImageOcrTask(taskId)
        : await queryVideoExtractTask(taskId);
    return Response.json(result);
  } catch (err) {
    console.error("[/api/recipes/import-video] query failed:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "查询失败" },
      { status: 500 }
    );
  }
}
