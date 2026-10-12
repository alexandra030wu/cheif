"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// 助手回复的 Markdown 渲染。原来气泡直接塞纯文本,闲聊 2-4 句看不出问题;
// 「同款」这类长回复带小标题/表格/列表,会挤成一整段(2026-10-12)。
// 尺寸贴着气泡的 text-sm,标题只做轻微加粗,不做文章式大标题。
const components: Components = {
  h1: ({ children }) => <h3 className="mt-3 mb-1.5 text-[15px] font-semibold first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mt-3 mb-1.5 text-[15px] font-semibold first:mt-0">{children}</h3>,
  h3: ({ children }) => <h4 className="mt-2.5 mb-1 font-semibold first:mt-0">{children}</h4>,
  h4: ({ children }) => <h4 className="mt-2.5 mb-1 font-semibold first:mt-0">{children}</h4>,
  p: ({ children }) => <p className="my-1.5 leading-relaxed first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-1.5 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-1.5 list-decimal space-y-1 pl-5">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="text-ink-soft">{children}</em>,
  hr: () => <hr className="my-3 border-pebble" />,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-pebble pl-3 text-ink-soft">{children}</blockquote>
  ),
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-2">
      {children}
    </a>
  ),
  code: ({ children }) => <code className="rounded bg-surface-dim px-1 py-0.5 text-[12.5px]">{children}</code>,
  // 表格在窄气泡里可能放不下,横向滚动而不是撑破气泡
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-pebble px-2 py-1.5 text-left font-semibold whitespace-nowrap">{children}</th>
  ),
  td: ({ children }) => <td className="border-b border-pebble/60 px-2 py-1.5 align-top">{children}</td>,
};

export function ChatMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
