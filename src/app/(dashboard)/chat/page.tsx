import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { ChatInterface } from "./_components/chat-interface";

async function ChatLoader() {
  const supabase = await createClient();
  const { data: ingredients } = await supabase
    .from("ingredients")
    .select("id, name, category, quantity, unit")
    .order("name", { ascending: true });

  return <ChatInterface ingredients={ingredients ?? []} />;
}

function ChatSkeleton() {
  return (
    <div className="flex flex-col h-screen animate-pulse">
      <div className="shrink-0 flex items-center justify-center py-3 border-b border-gray-100">
        <div className="h-5 w-20 bg-gray-200 rounded" />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="h-12 w-12 bg-gray-100 rounded-full mb-4" />
        <div className="h-5 w-32 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-48 bg-gray-100 rounded mb-8" />
        <div className="flex flex-wrap justify-center gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-full" style={{ width: `${80 + (i % 3) * 20}px` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<ChatSkeleton />}>
      <ChatLoader />
    </Suspense>
  );
}
