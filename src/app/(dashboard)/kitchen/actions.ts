"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { IngredientFormSchema } from "@/lib/validators/ingredient";
import { generateAndStoreIcon } from "@/lib/icon-generation";

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
  const { data: inserted, error } = await supabase
    .from("ingredients")
    .insert({ ...parsed.data, user_id: userId })
    .select("id, name")
    .single();

  if (error) return { status: "error", message: error.message };

  // Fire-and-forget icon generation
  if (inserted) void generateAndStoreIcon(inserted.id, inserted.name);

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

export type BulkAddResult =
  | { status: "success"; count: number }
  | { status: "error"; message: string };

export async function bulkAddIngredients(
  items: Array<{
    name: string;
    category: string;
    quantity?: number;
    unit?: string;
  }>
): Promise<BulkAddResult> {
  const { supabase, userId } = await getAuthUserId();

  const rows = items
    .map((item) => {
      const parsed = IngredientFormSchema.safeParse(item);
      return parsed.success ? { ...parsed.data, user_id: userId } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (rows.length === 0) {
    return { status: "error", message: "没有合法的食材数据" };
  }

  const { data: inserted, error } = await supabase
    .from("ingredients")
    .insert(rows)
    .select("id, name");
  if (error) return { status: "error", message: error.message };

  // Fire-and-forget icon generation for each
  if (inserted) {
    for (const row of inserted) {
      void generateAndStoreIcon(row.id, row.name);
    }
  }

  revalidateIngredients();
  return { status: "success", count: rows.length };
}
