"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

export interface ProfileData {
  nickname: string;
  avatar_url: string;
  default_servings: string;
  dietary_preferences: string[];
  allergies: string[];
  cooking_level: string;
  kitchen_equipment: string[];
  fat_loss_mode: boolean;
  daily_calorie_target: number | null;
  daily_protein_target_g: number | null;
}

export type SaveProfileResult =
  | { status: "success" }
  | { status: "error"; message: string };

export async function saveProfile(data: ProfileData): Promise<SaveProfileResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "未登录" };

  const { error } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      nickname: data.nickname || null,
      avatar_url: data.avatar_url || null,
      default_servings: data.default_servings || "1人食",
      dietary_preferences: data.dietary_preferences as unknown as Json,
      allergies: data.allergies,
      cooking_level: data.cooking_level || "beginner",
      kitchen_equipment: data.kitchen_equipment,
      fat_loss_mode: data.fat_loss_mode,
      daily_calorie_target: data.daily_calorie_target,
      daily_protein_target_g: data.daily_protein_target_g,
    });

  if (error) return { status: "error", message: error.message };

  revalidatePath("/settings");
  revalidatePath("/chat");
  return { status: "success" };
}
