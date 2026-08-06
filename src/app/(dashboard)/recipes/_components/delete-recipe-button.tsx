"use client";

import { useTransition } from "react";
import { deleteSavedRecipe } from "../actions";

export function DeleteRecipeButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => deleteSavedRecipe(id))}
      className="shrink-0 rounded-lg p-2 -m-1 text-ink-muted hover:text-danger active:text-danger disabled:opacity-40 transition-colors"
      title="删除"
      suppressHydrationWarning
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`w-4 h-4 ${pending ? "animate-spin" : ""}`}
        suppressHydrationWarning
      >
        {pending ? (
          <>
            <circle cx="12" cy="12" r="9" className="opacity-25" />
            <path d="M12 3a9 9 0 0 1 9 9" className="opacity-75" />
          </>
        ) : (
          <>
            <path d="M3 6h18" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </>
        )}
      </svg>
    </button>
  );
}
