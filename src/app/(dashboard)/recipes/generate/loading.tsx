export default function GenerateLoading() {
  return (
    <div className="px-4 py-6 md:p-8 md:max-w-2xl animate-pulse">
      {/* Header */}
      <div className="mb-8">
        <div className="h-7 w-40 bg-gray-200 rounded" />
        <div className="h-4 w-56 bg-gray-100 rounded mt-2" />
      </div>

      {/* Ingredients summary skeleton */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 mb-6">
        <div className="h-4 w-28 bg-gray-100 rounded mb-3" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-7 bg-gray-100 rounded-md"
              style={{ width: `${48 + (i % 3) * 16}px` }}
            />
          ))}
        </div>
      </div>

      {/* Button skeleton */}
      <div className="h-12 bg-gray-200 rounded-xl" />
    </div>
  );
}
