export default function KitchenLoading() {
  return (
    <div className="px-4 py-6 md:p-8 max-w-3xl bg-canvas animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-7 w-24 bg-pebble rounded" />
          <div className="h-4 w-16 bg-surface-dim rounded mt-2" />
        </div>
        <div className="h-9 w-24 bg-pebble rounded-full" />
      </div>

      {/* Search skeleton */}
      <div className="h-10 bg-surface-dim rounded-xl mb-3" />
      <div className="flex gap-1.5 mb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-7 bg-surface-dim rounded-full" style={{ width: `${48 + i * 8}px` }} />
        ))}
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-pebble/60 bg-surface p-3 flex flex-col items-center">
            <div className="w-14 h-14 bg-pebble rounded-lg mb-2" />
            <div className="h-3 w-12 bg-pebble rounded" />
            <div className="h-2.5 w-8 bg-surface-dim rounded mt-1" />
          </div>
        ))}
      </div>
    </div>
  );
}
