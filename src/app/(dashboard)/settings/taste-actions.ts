"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { aggregateTasteProfile } from "@/lib/taste";
import type { TasteProfile } from "@/lib/taste";

export type TasteActionResult =
  | { status: "success" }
  | { status: "error"; message: string };

/** Add an explicit taste signal (confidence = 1.0) */
export async function addTasteSignal(
  signalType: string,
  signalValue: string,
): Promise<TasteActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "未登录" };

  const { error } = await supabase.from("taste_signals").insert({
    user_id: user.id,
    signal_type: signalType,
    signal_value: signalValue,
    confidence: 1.0,
    source: "explicit",
  });

  if (error) return { status: "error", message: error.message };

  await aggregateTasteProfile(supabase, user.id);
  revalidatePath("/settings");
  revalidatePath("/chat");
  return { status: "success" };
}

/** Delete all signals matching a type+value, then re-aggregate */
export async function deleteTasteSignal(
  signalType: string,
  signalValue: string,
): Promise<TasteActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "未登录" };

  const { error } = await supabase
    .from("taste_signals")
    .delete()
    .eq("user_id", user.id)
    .eq("signal_type", signalType)
    .eq("signal_value", signalValue);

  if (error) return { status: "error", message: error.message };

  await aggregateTasteProfile(supabase, user.id);
  revalidatePath("/settings");
  revalidatePath("/chat");
  return { status: "success" };
}

/** Clear all taste data for the user */
export async function clearAllTasteData(): Promise<TasteActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "未登录" };

  const { error } = await supabase
    .from("taste_signals")
    .delete()
    .eq("user_id", user.id);

  if (error) return { status: "error", message: error.message };

  await aggregateTasteProfile(supabase, user.id);
  revalidatePath("/settings");
  revalidatePath("/chat");
  return { status: "success" };
}

/** Get the current taste profile */
export async function getTasteProfile(): Promise<TasteProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("taste_profile")
    .eq("id", user.id)
    .single();

  return (data?.taste_profile as TasteProfile | null) ?? null;
}
