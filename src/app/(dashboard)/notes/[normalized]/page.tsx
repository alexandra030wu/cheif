import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NoteDetailClient } from "./_components/note-detail-client";

type PageProps = { params: Promise<{ normalized: string }> };

export default async function NoteDetailPage({ params }: PageProps) {
  const { normalized: rawNormalized } = await params;
  const normalized = decodeURIComponent(rawNormalized);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: note } = await supabase
    .from("food_notes")
    .select("*")
    .eq("user_id", user.id)
    .eq("food_name_normalized", normalized)
    .maybeSingle();

  if (!note) notFound();

  return (
    <div className="px-4 py-6 md:p-8 max-w-2xl pt-14">
      <div className="mb-4">
        <Link
          href="/notes"
          className="text-xs text-ink-muted hover:text-ink-soft inline-flex items-center gap-1"
        >
          ← 全部笔记
        </Link>
      </div>
      <NoteDetailClient
        id={note.id}
        foodName={note.food_name}
        contentMd={note.content_md}
        ingredientTags={note.ingredient_tags ?? []}
        updatedAt={note.updated_at}
      />
    </div>
  );
}
