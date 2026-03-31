import { createAdminClient } from "./supabase/admin";

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict";

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
  const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio },
    }),
  });

  if (!res.ok) {
    console.error("[imagen] API error:", res.status, await res.text().catch(() => ""));
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

export async function generateAndStoreIcon(
  ingredientId: string,
  name: string
): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[icon-gen] GEMINI_API_KEY not set, skipping");
    return;
  }

  try {
    const buffer = await generateImage(apiKey, buildIconPrompt(name));
    if (!buffer) return;

    const admin = createAdminClient();
    const filePath = `${ingredientId}.png`;

    const { error: uploadError } = await admin.storage
      .from("ingredient-icons")
      .upload(filePath, buffer, { contentType: "image/png", upsert: true });

    if (uploadError) {
      console.error("[icon-gen] Storage upload error:", uploadError.message);
      return;
    }

    const { data: { publicUrl } } = admin.storage.from("ingredient-icons").getPublicUrl(filePath);
    await admin.from("ingredients").update({ icon_url: publicUrl }).eq("id", ingredientId);
  } catch (err) {
    console.error("[icon-gen] Unexpected error:", err instanceof Error ? err.message : err);
  }
}

/**
 * Generate a cover image for a recipe and store it in Supabase Storage.
 * Returns the public URL, or null on failure.
 */
export async function generateRecipeCover(
  recipeId: string,
  dishName: string
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const buffer = await generateImage(apiKey, buildCoverPrompt(dishName), "1:1");
    if (!buffer) return null;

    const admin = createAdminClient();
    const filePath = `${recipeId}.png`;

    const { error: uploadError } = await admin.storage
      .from("recipe-covers")
      .upload(filePath, buffer, { contentType: "image/png", upsert: true });

    if (uploadError) {
      console.error("[cover-gen] Storage upload error:", uploadError.message);
      return null;
    }

    const { data: { publicUrl } } = admin.storage.from("recipe-covers").getPublicUrl(filePath);
    return publicUrl;
  } catch (err) {
    console.error("[cover-gen] Unexpected error:", err instanceof Error ? err.message : err);
    return null;
  }
}
