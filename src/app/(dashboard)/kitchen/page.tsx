import { Suspense } from "react";
import Link from "next/link";
import { IngredientList } from "./_components/ingredient-list";

function ListSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-16 bg-pebble rounded mt-1 mb-8" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 md:gap-4 rounded-xl border border-pebble/60 bg-surface px-4 py-3.5 md:px-5 md:py-4"
          >
            <div className="h-5 w-12 bg-pebble rounded-md shrink-0" />
            <div
              className="h-4 flex-1 bg-pebble rounded"
              style={{ maxWidth: `${120 + i * 20}px` }}
            />
            <div className="h-4 w-14 bg-surface-dim rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function KitchenPage() {
  return (
    <div className="px-4 py-6 md:p-8 max-w-3xl bg-canvas">
      {/* Header — renders instantly */}
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold text-ink">食材库</h1>
        <Link
          href="/kitchen/add"
          className="rounded-full bg-ink px-4 py-2.5 md:py-2 text-[13px] font-medium text-white hover:bg-ink/90 active:bg-ink/80 transition-colors"
        >
          + 添加食材
        </Link>
      </div>

      {/* Ingredient list — streams in with skeleton fallback */}
      <Suspense fallback={<ListSkeleton />}>
        <IngredientList />
      </Suspense>
    </div>
  );
}
