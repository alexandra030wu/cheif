"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // 注册失败不影响使用(只是没有离线缓存),但要留下原因:以前这里静默吞掉,
      // sw.js 被中间件 307 到 /login、注册一直失败,没人发现
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("[sw] service worker 注册失败,离线缓存不可用:", err);
      });
    }
  }, []);

  return null;
}
