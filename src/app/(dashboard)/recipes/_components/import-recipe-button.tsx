"use client";

import { useState } from "react";
import { RecipeImportSheet } from "./recipe-import-sheet";

interface Props {
  variant?: "header" | "cta";
}

export function ImportRecipeButton({ variant = "header" }: Props) {
  const [open, setOpen] = useState(false);

  const className =
    variant === "header"
      ? "rounded-lg bg-gray-900 text-white px-3 py-1.5 text-sm font-medium hover:bg-gray-700 active:bg-gray-800 transition-colors"
      : "text-sm text-gray-900 underline underline-offset-2";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        + 导入菜谱
      </button>
      <RecipeImportSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
