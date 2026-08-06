import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import type { CookLogNutrition } from "./actions";
import { DeleteEntryButton } from "./_components/delete-entry-button";

// 用户在国内使用，按东八区划分"今天"（上海无夏令时，固定偏移安全）
function shanghaiTodayRange(): { start: string; end: string } {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
  }).format(new Date()); // YYYY-MM-DD
  const start = new Date(`${today}T00:00:00+08:00`);
  const end = new Date(start.getTime() + 86400000);
  return { start: start.toISOString(), end: end.toISOString() };
}

function ProgressBar({
  label,
  value,
  target,
  unit,
}: {
  label: string;
  value: number;
  target: number | null;
  unit: string;
}) {
  const pct = target ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const over = target != null && value > target;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[12.5px] font-medium text-ink">{label}</span>
        <span className="text-[12.5px] text-ink-soft">
          <span className={`font-semibold ${over ? "text-danger" : "text-ink"}`}>
            {Math.round(value)}
          </span>
          {target != null ? ` / ${target}` : ""} {unit}
        </span>
      </div>
      {target != null ? (
        <div className="h-2.5 rounded-full bg-pebble overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${over ? "bg-danger" : "bg-ok"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : (
        <p className="text-[11px] text-ink-muted">未设置目标，可在「个人设置 → 减脂模式」中填写</p>
      )}
    </div>
  );
}

async function NutritionLoader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <p className="text-[12.5px] text-ink-muted">请先登录</p>;
  }

  const { start, end } = shanghaiTodayRange();
  const [{ data: entries }, { data: profile }] = await Promise.all([
    supabase
      .from("cook_log")
      .select("id, recipe_title, nutrition, cooked_at")
      .gte("cooked_at", start)
      .lt("cooked_at", end)
      .order("cooked_at", { ascending: true }),
    supabase
      .from("profiles")
      .select("fat_loss_mode, daily_calorie_target, daily_protein_target_g")
      .eq("id", user.id)
      .single(),
  ]);

  const list = entries ?? [];
  const totals = list.reduce(
    (acc, e) => {
      const n = (e.nutrition ?? {}) as CookLogNutrition;
      acc.calories += n.calories ?? 0;
      acc.proteinG += n.proteinG ?? 0;
      acc.carbsG += n.carbsG ?? 0;
      acc.fatG += n.fatG ?? 0;
      return acc;
    },
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  );
  const missingNutrition = list.filter((e) => !e.nutrition).length;

  return (
    <div className="space-y-6">
      {/* Totals vs targets */}
      <section className="rounded-3xl bg-surface shadow-soft p-5 space-y-4">
        <ProgressBar
          label="热量"
          value={totals.calories}
          target={profile?.daily_calorie_target ?? null}
          unit="kcal"
        />
        <ProgressBar
          label="蛋白质"
          value={totals.proteinG}
          target={profile?.daily_protein_target_g ?? null}
          unit="g"
        />
        <div className="flex gap-4 pt-1 text-[11px] text-ink-muted">
          <span>碳水 {Math.round(totals.carbsG)}g</span>
          <span>脂肪 {Math.round(totals.fatG)}g</span>
        </div>
      </section>

      {missingNutrition > 0 && (
        <p className="text-[11px] text-warn bg-butter/60 rounded-lg px-3 py-2">
          有 {missingNutrition} 道菜缺少营养估算，未计入汇总
        </p>
      )}

      {/* Today's dishes */}
      <section>
        <h2 className="text-[13px] font-semibold text-ink mb-3">
          今天做过的菜（按单人份估算）
        </h2>
        {list.length === 0 ? (
          <p className="text-[12.5px] text-ink-muted rounded-xl bg-surface-dim px-4 py-6 text-center">
            还没有记录。在菜谱的烹饪模式中点「完成烹饪」，就会自动记到这里。
          </p>
        ) : (
          <div className="rounded-xl bg-surface border border-pebble/60 divide-y divide-pebble/60">
            {list.map((e) => {
              const n = (e.nutrition ?? {}) as CookLogNutrition;
              const time = new Intl.DateTimeFormat("zh-CN", {
                timeZone: "Asia/Shanghai",
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(e.cooked_at));
              return (
                <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] text-ink truncate">{e.recipe_title}</p>
                    <p className="text-[11px] text-ink-muted mt-0.5">
                      {time}
                      {n.calories != null
                        ? ` · ${n.calories} kcal · 蛋白 ${n.proteinG ?? "?"}g`
                        : " · 无营养数据"}
                    </p>
                  </div>
                  <DeleteEntryButton id={e.id} />
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default function NutritionPage() {
  return (
    <div className="px-4 py-6 md:p-8 max-w-lg pt-14">
      <h1 className="text-[22px] font-bold text-ink mb-1">今日营养</h1>
      <p className="text-[11px] text-ink-muted mb-6">当天做过的菜的营养估算汇总</p>
      <Suspense
        fallback={
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-pebble/40 rounded-3xl" />
            <div className="h-24 bg-pebble/40 rounded-xl" />
          </div>
        }
      >
        <NutritionLoader />
      </Suspense>
    </div>
  );
}
