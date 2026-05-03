import { createClient } from "@/lib/supabase/server";
import { extractFoodNotes } from "@/lib/food-note/extract";

export const maxDuration = 30;

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "未登录" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const conversation = body?.conversation;

  if (typeof conversation !== "string" || conversation.length === 0) {
    return Response.json({ error: "conversation is required" }, { status: 400 });
  }

  const notes = await extractFoodNotes(conversation);

  if (notes.length === 0) {
    return Response.json({ extracted: 0 });
  }

  const stamp = todayStamp();
  let appended = 0;

  for (const note of notes) {
    // Append fragment formatted as: blank line + horizontal rule + dated italic + summary
    const fragment = `\n\n---\n\n_${stamp}_\n\n${note.summary_md}`;
    const { error } = await supabase.rpc("append_food_note", {
      p_user_id: user.id,
      p_food_name: note.food_name,
      p_food_name_normalized: note.food_name_normalized,
      p_summary_md: fragment,
      p_entry_type: note.entry_type,
      p_ingredient_tags: note.ingredient_tags,
    });

    if (error) {
      console.error("[/api/food-notes/extract] rpc failed:", error.message);
      continue;
    }
    appended += 1;
  }

  return Response.json({ extracted: appended });
}
