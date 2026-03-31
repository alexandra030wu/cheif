import { Suspense } from "react";
import Link from "next/link";
import { IngredientList } from "./_components/ingredient-list";

function ListSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-16 bg-gray-100 rounded mt-1 mb-8" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 md:gap-4 rounded-xl border border-gray-100 bg-white px-4 py-3.5 md:px-5 md:py-4"
          >
            <div className="h-5 w-12 bg-gray-100 rounded-md shrink-0" />
            <div
              className="h-4 flex-1 bg-gray-100 rounded"
              style={{ maxWidth: `${120 + i * 20}px` }}
            />
            <div className="h-4 w-14 bg-gray-50 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function KitchenPage() {
  return (
    <div className="px-4 py-6 md:p-8 max-w-3xl">
      {/* Header — renders instantly */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">食材库</h1>
        <Link
          href="/kitchen/add"
          className="rounded-lg bg-gray-900 px-4 py-2.5 md:py-2 text-sm font-medium text-white hover:bg-gray-700 active:bg-gray-800 transition-colors"
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
