"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  id: string;
  foodName: string;
  contentMd: string;
  ingredientTags: string[];
  updatedAt: string;
}

// Lightweight md renderer — first slice keeps zero deps. Handles headings (#),
// horizontal rules (---), bullet lists (- ), italics (_text_) and bolds (**text**).
// Anything fancier we'll add when we install react-markdown in slice 2.
function renderMarkdown(md: string) {
  const lines = md.split("\n");
  const out: React.ReactNode[] = [];
  let listBuffer: string[] = [];

  const flushList = () => {
    if (listBuffer.length === 0) return;
    out.push(
      <ul key={`ul-${out.length}`} className="list-disc pl-5 my-2 space-y-1 text-ink-soft">
        {listBuffer.map((it, i) => (
          <li key={i}>{renderInline(it)}</li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  lines.forEach((line, i) => {
    if (/^---\s*$/.test(line)) {
      flushList();
      out.push(<hr key={`hr-${i}`} className="my-4 border-pebble/60" />);
      return;
    }
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flushList();
      const level = heading[1].length;
      const text = heading[2];
      const cls =
        level === 1
          ? "text-xl font-bold mt-4 mb-2 text-ink"
          : level === 2
            ? "text-lg font-semibold mt-3 mb-1.5 text-ink"
            : "text-base font-semibold mt-2 mb-1 text-ink";
      out.push(
        <p key={`h-${i}`} className={cls}>
          {renderInline(text)}
        </p>
      );
      return;
    }
    if (/^[-*]\s+/.test(line)) {
      listBuffer.push(line.replace(/^[-*]\s+/, ""));
      return;
    }
    flushList();
    if (line.trim() === "") {
      out.push(<div key={`sp-${i}`} className="h-2" />);
      return;
    }
    out.push(
      <p key={`p-${i}`} className="text-sm text-ink-soft leading-7">
        {renderInline(line)}
      </p>
    );
  });
  flushList();
  return out;
}

function renderInline(text: string): React.ReactNode {
  // Process **bold** then _italic_ — minimal split, fine for short fragments.
  const parts: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|_[^_]+_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) parts.push(<strong key={parts.length}>{tok.slice(2, -2)}</strong>);
    else parts.push(<em key={parts.length} className="text-ink-muted">{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? parts : text;
}

export function NoteDetailClient({ id, foodName, contentMd, ingredientTags, updatedAt }: Props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(contentMd);
  const [content, setContent] = useState(contentMd);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/food-notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_md: draft }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data?.error === "string" ? data.error : "保存失败");
        return;
      }
      setContent(draft);
      setIsEditing(false);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm(`确定删除「${foodName}」笔记？此操作不可撤销。`)) return;
    const res = await fetch(`/api/food-notes/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/notes");
      router.refresh();
    } else {
      setError("删除失败");
    }
  };

  return (
    <div>
      <h1 className="text-[22px] font-bold text-ink">{foodName}</h1>
      <p className="text-[11px] text-ink-muted mt-1">
        最近更新 {new Date(updatedAt).toISOString().slice(0, 10)}
      </p>

      {ingredientTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {ingredientTags.map((t) => (
            <span
              key={t}
              className="text-[11px] px-2 py-0.5 rounded-full bg-pebble/40 text-ink-soft border border-pebble/60"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-6">
        {isEditing ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full min-h-[300px] p-3 text-sm font-mono leading-6 rounded-xl border border-pebble bg-pebble/20 text-ink placeholder-ink-muted focus:border-ink/30 focus:bg-surface focus:outline-none focus:ring-1 focus:ring-ink/20 transition-colors"
            placeholder="还没有内容…"
          />
        ) : (
          <div className="prose prose-sm max-w-none">
            {content.trim() ? (
              renderMarkdown(content)
            ) : (
              <p className="text-sm text-ink-muted">这篇笔记还是空的。继续聊就会自然长出来。</p>
            )}
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-xs text-danger">{error}</p>}

      <div className="mt-6 flex items-center gap-2">
        {isEditing ? (
          <>
            <button
              type="button"
              onClick={save}
              disabled={isSaving}
              className="px-3 py-1.5 text-sm rounded-full bg-ink text-white hover:bg-ink/90 active:bg-ink/80 transition-colors disabled:opacity-50"
            >
              {isSaving ? "保存中…" : "保存"}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(content);
                setIsEditing(false);
                setError(null);
              }}
              className="px-3 py-1.5 text-sm rounded-full text-ink-soft hover:bg-surface-dim transition-colors"
            >
              取消
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-3 py-1.5 text-sm rounded-full border border-pebble text-ink-soft hover:bg-surface-dim transition-colors"
            >
              编辑
            </button>
            <button
              type="button"
              onClick={remove}
              className="px-3 py-1.5 text-sm rounded-full text-danger hover:bg-danger/10 transition-colors"
            >
              删除
            </button>
          </>
        )}
      </div>
    </div>
  );
}
