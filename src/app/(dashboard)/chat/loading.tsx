export default function ChatLoading() {
  return (
    <div className="flex flex-col h-[calc(100vh-env(safe-area-inset-top,0px))] animate-pulse">
      <div className="shrink-0 flex items-center justify-center py-3 border-b border-pebble/60">
        <div className="h-5 w-20 bg-pebble rounded" />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="h-12 w-12 bg-surface-dim rounded-full mb-4" />
        <div className="h-5 w-32 bg-pebble rounded mb-2" />
        <div className="h-4 w-48 bg-surface-dim rounded" />
      </div>
    </div>
  );
}
