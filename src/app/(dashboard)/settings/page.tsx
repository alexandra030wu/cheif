import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./_components/settings-form";
import { TasteProfileSection } from "./_components/taste-profile-section";
import { EMPTY_TASTE_PROFILE, type TasteProfile } from "@/lib/taste";
import type { ProfileData } from "./actions";

async function SettingsLoader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initial: ProfileData = {
    nickname: "",
    avatar_url: "🧑‍🍳",
    default_servings: "1人食",
    dietary_preferences: [],
    allergies: [],
    cooking_level: "beginner",
    kitchen_equipment: [],
    fat_loss_mode: false,
    daily_calorie_target: null,
    daily_protein_target_g: null,
    ai_model_preference: "claude",
  };

  let tasteProfile: TasteProfile = EMPTY_TASTE_PROFILE;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profile) {
      initial = {
        nickname: profile.nickname ?? "",
        avatar_url: profile.avatar_url ?? "🧑‍🍳",
        default_servings: profile.default_servings ?? "1人食",
        dietary_preferences: Array.isArray(profile.dietary_preferences)
          ? (profile.dietary_preferences as string[])
          : [],
        allergies: profile.allergies ?? [],
        cooking_level: profile.cooking_level ?? "beginner",
        kitchen_equipment: profile.kitchen_equipment ?? [],
        fat_loss_mode: profile.fat_loss_mode ?? false,
        daily_calorie_target: profile.daily_calorie_target ?? null,
        daily_protein_target_g: profile.daily_protein_target_g ?? null,
        ai_model_preference:
          profile.ai_model_preference === "deepseek" ? "deepseek" : "claude",
      };
      tasteProfile = (profile.taste_profile as TasteProfile | null) ?? EMPTY_TASTE_PROFILE;
    }
  }

  return (
    <>
      <SettingsForm initial={initial} />
      <div className="mt-8 pt-8 border-t border-gray-100">
        <TasteProfileSection profile={tasteProfile} />
      </div>
    </>
  );
}

export default function SettingsPage() {
  return (
    <div className="px-4 py-6 md:p-8 max-w-lg pt-14">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">个人设置</h1>
      <Suspense
        fallback={
          <div className="animate-pulse space-y-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i}>
                <div className="h-4 w-20 bg-gray-200 rounded mb-3" />
                <div className="h-10 bg-gray-100 rounded-lg" />
              </div>
            ))}
          </div>
        }
      >
        <SettingsLoader />
      </Suspense>
    </div>
  );
}
