import { createClient } from "@/lib/supabase/server";
import { extractTasteSignals } from "@/lib/taste/extract";
import { aggregateTasteProfile } from "@/lib/taste/aggregate";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "未登录" }, { status: 401 });
  }

  const body = await request.json();
  const conversation = body.conversation;

  if (typeof conversation !== "string" || conversation.length === 0) {
    return Response.json({ error: "conversation is required" }, { status: 400 });
  }

  // Extract signals via cheap AI model
  const signals = await extractTasteSignals(conversation);

  if (signals.length === 0) {
    return Response.json({ extracted: 0 });
  }

  // Insert signals into taste_signals table
  const { error: insertError } = await supabase.from("taste_signals").insert(
    signals.map((s) => ({
      user_id: user.id,
      signal_type: s.signal_type,
      signal_value: s.signal_value,
      confidence: s.confidence,
      source: "chat" as const,
      context: s.context ?? null,
    })),
  );

  if (insertError) {
    return Response.json({ error: insertError.message }, { status: 500 });
  }

  // Re-aggregate taste profile
  await aggregateTasteProfile(supabase, user.id);

  return Response.json({ extracted: signals.length });
}
