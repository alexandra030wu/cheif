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
      ? "rounded-full bg-ink text-white px-3 py-1.5 text-[12.5px] font-medium hover:bg-ink/90 active:bg-ink/80 transition-colors"
      : "text-[12.5px] text-ink underline underline-offset-2";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        + 导入菜谱
      </button>
      <RecipeImportSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
