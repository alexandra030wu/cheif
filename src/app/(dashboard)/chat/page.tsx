import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { EMPTY_TASTE_PROFILE, type TasteProfile } from "@/lib/taste";
import { ChatInterface } from "./_components/chat-interface";

async function ChatLoader() {
  const supabase = await createClient();

  const [{ data: ingredients }, { data: { user } }] = await Promise.all([
    supabase
      .from("ingredients")
      .select("id, name, category, quantity, unit, expiry_date")
      .order("name", { ascending: true }),
    supabase.auth.getUser(),
  ]);

  let preferences: {
    nickname?: string;
    dietary_preferences?: string[];
    allergies?: string[];
    cooking_level?: string;
    kitchen_equipment?: string[];
    default_servings?: string;
  } | undefined;

  let tasteProfile: TasteProfile = EMPTY_TASTE_PROFILE;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("nickname, dietary_preferences, allergies, cooking_level, kitchen_equipment, default_servings, taste_profile")
      .eq("id", user.id)
      .single();

    if (profile) {
      preferences = {
        nickname: profile.nickname ?? undefined,
        dietary_preferences: Array.isArray(profile.dietary_preferences)
          ? (profile.dietary_preferences as string[])
          : undefined,
        allergies: profile.allergies ?? undefined,
        cooking_level: profile.cooking_level ?? undefined,
        kitchen_equipment: profile.kitchen_equipment ?? undefined,
        default_servings: profile.default_servings ?? undefined,
      };
      tasteProfile = (profile.taste_profile as TasteProfile | null) ?? EMPTY_TASTE_PROFILE;
    }
  }

  return (
    <ChatInterface
      ingredients={ingredients ?? []}
      userPreferences={preferences}
      tasteProfile={tasteProfile}
    />
  );
}

function ChatSkeleton() {
  return (
    <div className="flex flex-col h-[calc(100vh-env(safe-area-inset-top,0px))] animate-pulse">
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
