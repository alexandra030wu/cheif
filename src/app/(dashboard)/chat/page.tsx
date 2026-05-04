import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { EMPTY_TASTE_PROFILE, type TasteProfile } from "@/lib/taste";
import type { Recipe } from "@/lib/ai-service";
import type { ChatMessage } from "@/stores/chat-store";
import { ChatInterface } from "./_components/chat-interface";

// Skip Next.js Router Cache for /chat. Otherwise client-side navigation back
// to /chat would replay a stale RSC payload (with no messages) and the page
// would render empty even though the DB has fresh history.
export const dynamic = "force-dynamic";

// Initial-page fetch window: just today (local date midnight).
function todayStartIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

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
  let initialMessages: ChatMessage[] = [];

  if (user) {
    const { data: rawMessages } = await supabase
      .from("messages")
      .select("id, role, content, recipes, created_at")
      .eq("user_id", user.id)
      .gte("created_at", todayStartIso())
      .order("created_at", { ascending: true });

    initialMessages = (rawMessages ?? []).map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      recipes: Array.isArray(m.recipes) ? (m.recipes as unknown as Recipe[]) : undefined,
      createdAt: m.created_at,
    }));
  }

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
      // 老用户的 taste_profile 可能是 partial 对象（缺早期没有的字段）。
      // 必须把缺失字段 merge 上空值，否则 Zod 校验会 hard fail。
      const raw = profile.taste_profile as Partial<TasteProfile> | null;
      tasteProfile = raw ? { ...EMPTY_TASTE_PROFILE, ...raw } : EMPTY_TASTE_PROFILE;
    }
  }

  return (
    <ChatInterface
      ingredients={ingredients ?? []}
      userPreferences={preferences}
      tasteProfile={tasteProfile}
      initialMessages={initialMessages}
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
