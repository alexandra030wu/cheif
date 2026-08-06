import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./_components/settings-form";
import { TasteProfileSection } from "./_components/taste-profile-section";
import { UsageBadge } from "../chat/_components/usage-badge";
import { LogoutButton } from "../_components/logout-button";
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
      <section className="mt-4 rounded-3xl bg-surface shadow-soft p-5">
        <TasteProfileSection profile={tasteProfile} />
      </section>
      {/* 本月用量(从顶栏/聊天迁入) */}
      <section className="mt-4 rounded-3xl bg-surface shadow-soft p-5 flex items-center justify-between">
        <div>
          <h2 className="text-[13px] font-semibold text-ink whitespace-nowrap">本月用量</h2>
          <p className="text-[11px] text-ink-muted mt-1">聊天与菜谱生成消耗的 Token,点徽章看明细</p>
        </div>
        <UsageBadge />
      </section>
      {/* 账户操作:退出登录独立成卡,正经按钮形态 */}
      <section className="mt-4 mb-10 rounded-3xl bg-surface shadow-soft p-5 flex items-center justify-between">
        <div>
          <h2 className="text-[13px] font-semibold text-ink whitespace-nowrap">账户</h2>
          <p className="text-[11px] text-ink-muted mt-1">退出后需重新登录才能使用</p>
        </div>
        <LogoutButton variant="button" />
      </section>
    </>
  );
}

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-6 pt-14 md:px-8 md:pt-6">
      <h1 className="text-[22px] font-bold text-ink mb-6">个人设置</h1>
      <Suspense
        fallback={
          <div className="animate-pulse space-y-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i}>
                <div className="h-4 w-20 bg-pebble rounded mb-3" />
                <div className="h-10 bg-surface-dim rounded-lg" />
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
