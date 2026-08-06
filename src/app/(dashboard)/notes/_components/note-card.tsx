import Link from "next/link";

interface Props {
  foodName: string;
  normalized: string;
  tags: string[];
  updatedAt: string;
  coverImageUrl: string | null;
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} 天前`;
  if (d < 30) return `${Math.floor(d / 7)} 周前`;
  return new Date(iso).toISOString().slice(0, 10);
}

// 8-color gradient picker — pseudo-random per name so the same food gets the
// same gradient between renders. Removes the empty-cover problem until we add
// real image generation in slice 2.
// pastel token pairs (DanOS 点缀色,低饱和邻近色相,对齐 recipe-card.tsx 兜底)
const GRADIENTS = [
  "from-butter to-peach",
  "from-blush to-peach",
  "from-mint to-sky",
  "from-sky to-lilac",
  "from-lilac to-blush",
  "from-butter to-mint",
  "from-mint to-sky",
  "from-blush to-lilac",
];

function gradientFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

export function NoteCard({ foodName, normalized, tags, updatedAt, coverImageUrl }: Props) {
  const visibleTags = tags.slice(0, 3);
  const overflow = tags.length - visibleTags.length;

  return (
    <Link
      href={`/notes/${encodeURIComponent(normalized)}`}
      className="group block rounded-3xl bg-surface shadow-soft hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 ease-spring overflow-hidden"
    >
      <div
        className={`aspect-square bg-gradient-to-br ${gradientFor(foodName)} flex items-center justify-center`}
        style={
          coverImageUrl
            ? { backgroundImage: `url(${coverImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
            : undefined
        }
      >
        {!coverImageUrl && (
          <span className="text-2xl font-bold text-ink/50 px-2 text-center break-all">
            {foodName}
          </span>
        )}
      </div>
      <div className="px-3 py-2.5">
        <p className="text-[13px] font-semibold text-ink truncate">{foodName}</p>
        <p className="text-[11px] text-ink-muted mt-0.5">{formatRelative(updatedAt)}</p>
        {visibleTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {visibleTags.map((t) => (
              <span
                key={t}
                className="text-[10px] px-1.5 py-0.5 rounded-full bg-pebble/40 text-ink-soft border border-pebble/60"
              >
                {t}
              </span>
            ))}
            {overflow > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 text-ink-muted">+{overflow}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
