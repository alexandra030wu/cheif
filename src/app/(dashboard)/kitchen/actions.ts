"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { IngredientFormSchema } from "@/lib/validators/ingredient";
import { generateAndStoreIcon } from "@/lib/icon-generation";
import { normalizeIngredientName } from "@/lib/icon-generation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

async function getAuthUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未登录");
  return { supabase, userId: user.id };
}

function revalidateIngredients() {
  revalidatePath("/kitchen");
  revalidatePath("/chat");
}

// ── Dedup/merge logic ──────────────────────────────────────────

interface IngredientInput {
  name: string;
  category: string;
  quantity?: number;
  unit?: string;
  expiry_date?: string;
  notes?: string;
}

/**
 * Upsert a single ingredient: if same-name ingredient exists for this user,
 * accumulate quantity and use the later expiry_date. Otherwise insert new.
 * Returns the ingredient id.
 */
async function upsertIngredient(
  supabase: SupabaseClient<Database>,
  userId: string,
  item: IngredientInput,
): Promise<{ id: string; name: string; isNew: boolean }> {
  const normalized = normalizeIngredientName(item.name);

  // Fetch all user ingredients and match by normalized name
  const { data: existing } = await supabase
    .from("ingredients")
    .select("id, name, quantity, unit, expiry_date")
    .eq("user_id", userId);

  const match = existing?.find(
    (e) => normalizeIngredientName(e.name) === normalized,
  );

  if (match) {
    // Merge: accumulate quantity, use later expiry_date
    const mergedQuantity =
      item.quantity != null
        ? (match.quantity ?? 0) + item.quantity
        : match.quantity;

    const mergedExpiry = laterDate(match.expiry_date, item.expiry_date ?? null);

    await supabase
      .from("ingredients")
      .update({
        quantity: mergedQuantity,
        ...(item.unit && { unit: item.unit }),
        expiry_date: mergedExpiry,
      })
      .eq("id", match.id);

    return { id: match.id, name: match.name, isNew: false };
  }

  // New ingredient
  const { data: inserted, error } = await supabase
    .from("ingredients")
    .insert({ ...item, user_id: userId })
    .select("id, name")
    .single();

  if (error) throw new Error(error.message);
  return { id: inserted.id, name: inserted.name, isNew: true };
}

/** Return the later of two ISO date strings (or the non-null one). */
function laterDate(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

// ── Public actions ─────────────────────────────────────────────

export type AddIngredientState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; fieldErrors?: Record<string, string[]>; message?: string };

export async function addIngredient(
  _prevState: AddIngredientState,
  formData: FormData
): Promise<AddIngredientState> {
  const raw = {
    name: formData.get("name") as string,
    category: formData.get("category") as string,
    quantity: formData.get("quantity") ? Number(formData.get("quantity")) : undefined,
    unit: (formData.get("unit") as string) || undefined,
    expiry_date: (formData.get("expiry_date") as string) || undefined,
    notes: (formData.get("notes") as string) || undefined,
  };

  const parsed = IngredientFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { supabase, userId } = await getAuthUserId();

  try {
    const result = await upsertIngredient(supabase, userId, parsed.data);
    if (result.isNew) {
      void generateAndStoreIcon(result.id, result.name);
    }
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "保存失败" };
  }

  revalidateIngredients();
  return { status: "success" };
}

export type UpdateIngredientResult =
  | { status: "success" }
  | { status: "error"; fieldErrors?: Record<string, string[]>; message?: string };

export async function updateIngredient(
  id: string,
  data: {
    name: string;
    category: string;
    quantity?: number;
    unit?: string;
    expiry_date?: string;
  }
): Promise<UpdateIngredientResult> {
  const parsed = IngredientFormSchema.safeParse(data);
  if (!parsed.success) {
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { supabase } = await getAuthUserId();
  const { error } = await supabase
    .from("ingredients")
    .update(parsed.data)
    .eq("id", id);

  if (error) return { status: "error", message: error.message };

  revalidateIngredients();
  return { status: "success" };
}

export async function deleteIngredient(id: string) {
  const { supabase } = await getAuthUserId();
  await supabase.from("ingredients").delete().eq("id", id);
  revalidateIngredients();
}

export async function batchDeleteIngredients(ids: string[]): Promise<{ count: number }> {
  if (ids.length === 0) return { count: 0 };
  const { supabase } = await getAuthUserId();
  await supabase.from("ingredients").delete().in("id", ids);
  revalidateIngredients();
  return { count: ids.length };
}

export type BulkAddResult =
  | { status: "success"; count: number }
  | { status: "error"; message: string };

export async function bulkAddIngredients(
  items: Array<{
    name: string;
    category: string;
    quantity?: number;
    unit?: string;
    expiry_date?: string;
  }>
): Promise<BulkAddResult> {
  const { supabase, userId } = await getAuthUserId();

  const validItems = items
    .map((item) => {
      const parsed = IngredientFormSchema.safeParse(item);
      return parsed.success ? parsed.data : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (validItems.length === 0) {
    return { status: "error", message: "没有合法的食材数据" };
  }

  // Fetch existing ingredients once for dedup
  const { data: existing } = await supabase
    .from("ingredients")
    .select("id, name, quantity, unit, expiry_date")
    .eq("user_id", userId);

  const existingMap = new Map(
    (existing ?? []).map((e) => [normalizeIngredientName(e.name), e]),
  );

  let newCount = 0;
  const toInsert: Array<typeof validItems[number] & { user_id: string }> = [];
  const toUpdate: Array<{ id: string; quantity: number | null; expiry_date: string | null; unit?: string }> = [];

  for (const item of validItems) {
    const normalized = normalizeIngredientName(item.name);
    const match = existingMap.get(normalized);

    if (match) {
      const mergedQuantity =
        item.quantity != null
          ? (match.quantity ?? 0) + item.quantity
          : match.quantity;
      const mergedExpiry = laterDate(match.expiry_date, item.expiry_date ?? null);

      toUpdate.push({
        id: match.id,
        quantity: mergedQuantity,
        expiry_date: mergedExpiry,
        ...(item.unit && { unit: item.unit }),
      });

      // Update the map so subsequent items with same name accumulate correctly
      existingMap.set(normalized, {
        ...match,
        quantity: mergedQuantity,
        expiry_date: mergedExpiry,
      });
    } else {
      toInsert.push({ ...item, user_id: userId });
      // Add to map so duplicates within the same batch also merge
      existingMap.set(normalized, {
        id: "",
        name: item.name,
        quantity: item.quantity ?? null,
        unit: item.unit ?? null,
        expiry_date: item.expiry_date ?? null,
      });
      newCount++;
    }
  }

  // Execute updates
  for (const upd of toUpdate) {
    const { id, ...fields } = upd;
    await supabase.from("ingredients").update(fields).eq("id", id);
  }

  // Execute inserts
  if (toInsert.length > 0) {
    const { data: inserted, error } = await supabase
      .from("ingredients")
      .insert(toInsert)
      .select("id, name");

    if (error) return { status: "error", message: error.message };

    if (inserted) {
      for (const row of inserted) {
        void generateAndStoreIcon(row.id, row.name);
      }
    }
  }

  revalidateIngredients();
  return { status: "success", count: validItems.length };
}
