export default function RecipesLoading() {
  return (
    <div className="px-4 py-6 md:p-8 animate-pulse">
      <div className="h-7 w-24 bg-pebble rounded mb-6" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-surface-dim rounded-3xl" />
        ))}
      </div>
    </div>
  );
}
