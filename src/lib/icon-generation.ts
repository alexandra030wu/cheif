import { createHash } from "node:crypto";
import { createAdminClient } from "./supabase/admin";

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict";

// Accept either env var name — `GOOGLE_API_KEY` is Google's own convention,
// `GEMINI_API_KEY` is what we documented first. Value is the same API key.
function resolveGeminiKey(): string | undefined {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
}

function buildIconPrompt(name: string): string {
  return `A realistic food icon of exactly ${name}, on a pure white background, centered, no text, no shadow, product photography style, high definition`;
}

function buildCoverPrompt(dishName: string): string {
  return `A beautiful plated dish of ${dishName}, top-down food photography, natural lighting, white plate, restaurant quality, appetizing, high definition`;
}

async function generateImage(
  apiKey: string,
  prompt: string,
  aspectRatio = "1:1"
): Promise<Buffer | null> {
  let res: Response;
  try {
    // 25s hard timeout — below Vercel Hobby 60s function limit so errors surface in
    // logs instead of the whole function being killed silently.
    res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1, aspectRatio },
      }),
      signal: AbortSignal.timeout(25000),
    });
  } catch (err) {
    console.warn("[imagen] fetch failed:", err instanceof Error ? err.message : err);
    return null;
  }

  if (!res.ok) {
    // 429 is rate-limit — expected under burst, keep log quiet
    if (res.status === 429) {
      console.warn("[imagen] rate-limited (429), skipping this cover");
    } else {
      console.error("[imagen] API error:", res.status, await res.text().catch(() => ""));
    }
    return null;
  }

  const data = await res.json();
  const base64 = data?.predictions?.[0]?.bytesBase64Encoded;
  if (!base64) {
    console.error("[imagen] No image data in response");
    return null;
  }

  return Buffer.from(base64, "base64");
}

// ── Name normalization ──

export function normalizeIngredientName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[（）()]/g, "");
}

// ── Shared icon library ──

/**
 * Get or create a shared ingredient icon.
 * Returns the icon URL from the shared library, generating one if it doesn't exist.
 * Updates the ingredient row's icon_url as a side-effect.
 */
export async function getOrCreateSharedIcon(
  ingredientId: string,
  name: string
): Promise<void> {
  const admin = createAdminClient();
  const normalized = normalizeIngredientName(name);

  // 1. Check shared library
  const { data: existing } = await admin
    .from("ingredient_icons")
    .select("icon_url")
    .eq("name_normalized", normalized)
    .single();

  if (existing) {
    // Cache hit — just update the ingredient row
    await admin
      .from("ingredients")
      .update({ icon_url: existing.icon_url })
      .eq("id", ingredientId);
    return;
  }

  // 2. Cache miss — generate new icon
  const apiKey = resolveGeminiKey();
  if (!apiKey) {
    console.warn("[icon-gen] GEMINI_API_KEY / GOOGLE_API_KEY not set, skipping");
    return;
  }

  try {
    const buffer = await generateImage(apiKey, buildIconPrompt(name));
    if (!buffer) return;

    const filePath = `${normalized}.webp`;

    const { error: uploadError } = await admin.storage
      .from("ingredient-icons")
      .upload(filePath, buffer, { contentType: "image/webp", upsert: true });

    if (uploadError) {
      console.error("[icon-gen] Storage upload error:", uploadError.message);
      return;
    }

    const {
      data: { publicUrl },
    } = admin.storage.from("ingredient-icons").getPublicUrl(filePath);

    // 3. Insert into shared library
    await admin.from("ingredient_icons").upsert(
      {
        name,
        name_normalized: normalized,
        icon_url: publicUrl,
      },
      { onConflict: "name_normalized" }
    );

    // 4. Update ingredient row
    await admin
      .from("ingredients")
      .update({ icon_url: publicUrl })
      .eq("id", ingredientId);
  } catch (err) {
    console.error("[icon-gen] Unexpected error:", err instanceof Error ? err.message : err);
  }
}

/**
 * @deprecated Use getOrCreateSharedIcon instead.
 * Kept for backwards compatibility — redirects to the shared icon flow.
 */
export async function generateAndStoreIcon(
  ingredientId: string,
  name: string
): Promise<void> {
  return getOrCreateSharedIcon(ingredientId, name);
}

/**
 * Get or create a shared cover image for a recipe title.
 * Mirrors the ingredient-icon pattern: DB lookup first (~10ms on cache hit),
 * Imagen generation + Storage upload + DB insert on miss. Persistent across
 * sessions — same title is never regenerated. Safe for chat-generated recipes
 * (no saved recipe row required).
 */
export async function getOrCreateSharedCover(title: string): Promise<string | null> {
  const normalized = normalizeIngredientName(title);
  if (!normalized) return null;

  const admin = createAdminClient();

  // 1. DB lookup — fast cache hit
  const { data: existing } = await admin
    .from("recipe_covers")
    .select("cover_url")
    .eq("title_normalized", normalized)
    .maybeSingle();

  if (existing?.cover_url) return existing.cover_url;

  // 2. Cache miss — generate
  const apiKey = resolveGeminiKey();
  if (!apiKey) {
    console.warn("[cover-gen shared] GEMINI_API_KEY / GOOGLE_API_KEY not set, skipping");
    return null;
  }

  // Supabase Storage keys must be ASCII-safe — Chinese titles break uploads with
  // "Invalid key". Hash the normalized title to a stable 16-char hex key.
  const titleHash = createHash("sha256").update(normalized).digest("hex").slice(0, 16);
  const filePath = `shared-${titleHash}.png`;

  try {
    const buffer = await generateImage(apiKey, buildCoverPrompt(title), "1:1");
    if (!buffer) return null;

    const { error: uploadError } = await admin.storage
      .from("recipe-covers")
      .upload(filePath, buffer, { contentType: "image/png", upsert: true });

    if (uploadError) {
      console.error("[cover-gen shared] Storage upload error:", uploadError.message);
      return null;
    }

    const {
      data: { publicUrl },
    } = admin.storage.from("recipe-covers").getPublicUrl(filePath);

    // 3. Insert into shared library (upsert defensively in case a concurrent request won the race)
    await admin
      .from("recipe_covers")
      .upsert(
        { title, title_normalized: normalized, cover_url: publicUrl },
        { onConflict: "title_normalized" }
      );

    return publicUrl;
  } catch (err) {
    console.error("[cover-gen shared] Unexpected error:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Generate a cover image for a saved recipe — delegates to the shared cover
 * library (`recipe_covers`) so same-title recipes across users reuse one image
 * and transient Imagen failures don't block future saves. Updates the
 * `recipes.cover_image_url` column as a side-effect.
 */
export async function generateAndStoreCover(
  recipeId: string,
  dishName: string
): Promise<void> {
  const coverUrl = await getOrCreateSharedCover(dishName);
  if (!coverUrl) return;

  try {
    const admin = createAdminClient();
    await admin
      .from("recipes")
      .update({ cover_image_url: coverUrl })
      .eq("id", recipeId);
  } catch (err) {
    console.error("[cover-gen] Failed to update recipe row:", err instanceof Error ? err.message : err);
  }
}
