export default function ChatLoading() {
  return (
    <div className="flex flex-col h-screen animate-pulse">
      <div className="shrink-0 flex items-center justify-center py-3 border-b border-gray-100">
        <div className="h-5 w-20 bg-gray-200 rounded" />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="h-12 w-12 bg-gray-100 rounded-full mb-4" />
        <div className="h-5 w-32 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-48 bg-gray-100 rounded" />
      </div>
    </div>
  );
}
