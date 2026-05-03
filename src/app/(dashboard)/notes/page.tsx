import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { NoteCard } from "./_components/note-card";

async function NotesLoader() {
  const supabase = await createClient();

  const { data: notes } = await supabase
    .from("food_notes")
    .select("id, food_name, food_name_normalized, ingredient_tags, content_md, updated_at, cover_image_url")
    .order("updated_at", { ascending: false });

  if (!notes || notes.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-4xl mb-3">🌱</p>
        <p className="text-sm leading-6">
          还没有食物笔记。
          <br />
          继续聊吃的，它们会在这里慢慢生长。
        </p>
        <div className="mt-4">
          <Link href="/chat" className="text-sm text-gray-900 underline underline-offset-2">
            去聊天
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {notes.map((n) => (
        <NoteCard
          key={n.id}
          foodName={n.food_name}
          normalized={n.food_name_normalized}
          tags={n.ingredient_tags ?? []}
          updatedAt={n.updated_at}
          coverImageUrl={n.cover_image_url}
        />
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="animate-pulse grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-40 bg-gray-100 rounded-xl" />
      ))}
    </div>
  );
}

export default function NotesPage() {
  return (
    <div className="px-4 py-6 md:p-8 max-w-3xl pt-14">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">食物笔记</h1>
        <p className="text-xs text-gray-400 mt-1">聊过的食物会在这里慢慢长成一篇你自己的笔记。</p>
      </div>
      <Suspense fallback={<ListSkeleton />}>
        <NotesLoader />
      </Suspense>
    </div>
  );
}
