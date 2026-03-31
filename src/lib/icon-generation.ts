import { createAdminClient } from "./supabase/admin";

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict";

function buildPrompt(name: string): string {
  return `A flat minimal food icon of ${name}, white background, simple clean vector style, centered, no text, no shadow, 128x128 pixels`;
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
    // 1. Generate image via Gemini Imagen
    const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt: buildPrompt(name) }],
        parameters: { sampleCount: 1, aspectRatio: "1:1" },
      }),
    });

    if (!res.ok) {
      console.error("[icon-gen] Imagen API error:", res.status, await res.text().catch(() => ""));
      return;
    }

    const data = await res.json();
    const base64 = data?.predictions?.[0]?.bytesBase64Encoded;
    if (!base64) {
      console.error("[icon-gen] No image data in response");
      return;
    }

    const buffer = Buffer.from(base64, "base64");

    // 2. Upload to Supabase Storage
    const admin = createAdminClient();
    const filePath = `${ingredientId}.png`;

    const { error: uploadError } = await admin.storage
      .from("ingredient-icons")
      .upload(filePath, buffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("[icon-gen] Storage upload error:", uploadError.message);
      return;
    }

    // 3. Build public URL and update ingredient
    const {
      data: { publicUrl },
    } = admin.storage.from("ingredient-icons").getPublicUrl(filePath);

    await admin
      .from("ingredients")
      .update({ icon_url: publicUrl })
      .eq("id", ingredientId);
  } catch (err) {
    console.error("[icon-gen] Unexpected error:", err instanceof Error ? err.message : err);
  }
}
