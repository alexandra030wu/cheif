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
const GRADIENTS = [
  "from-amber-100 to-orange-200",
  "from-rose-100 to-pink-200",
  "from-lime-100 to-emerald-200",
  "from-sky-100 to-indigo-200",
  "from-violet-100 to-purple-200",
  "from-yellow-100 to-amber-200",
  "from-teal-100 to-cyan-200",
  "from-fuchsia-100 to-pink-200",
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
      className="group block rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden"
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
          <span className="text-2xl font-bold text-white/80 px-2 text-center break-all">
            {foodName}
          </span>
        )}
      </div>
      <div className="px-3 py-2.5">
        <p className="text-sm font-medium text-gray-900 truncate">{foodName}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">{formatRelative(updatedAt)}</p>
        {visibleTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {visibleTags.map((t) => (
              <span
                key={t}
                className="text-[10px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-500 border border-gray-100"
              >
                {t}
              </span>
            ))}
            {overflow > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 text-gray-400">+{overflow}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
