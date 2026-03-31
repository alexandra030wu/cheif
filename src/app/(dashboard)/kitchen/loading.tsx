export default function KitchenLoading() {
  return (
    <div className="px-4 py-6 md:p-8 max-w-3xl animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-7 w-24 bg-gray-200 rounded" />
          <div className="h-4 w-16 bg-gray-100 rounded mt-2" />
        </div>
        <div className="h-9 w-24 bg-gray-200 rounded-lg" />
      </div>

      {/* List skeleton */}
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 md:gap-4 rounded-xl border border-gray-100 bg-white px-4 py-3.5 md:px-5 md:py-4"
          >
            <div className="h-5 w-12 bg-gray-100 rounded-md shrink-0" />
            <div className="h-4 flex-1 bg-gray-100 rounded" style={{ maxWidth: `${120 + i * 20}px` }} />
            <div className="h-4 w-14 bg-gray-50 rounded" />
            <div className="h-4 w-20 bg-gray-50 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
