"use client";

import { useTransition } from "react";
import { deleteIngredient } from "../actions";

export function DeleteButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => deleteIngredient(id))}
      className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40 transition-colors"
    >
      {pending ? "删除中…" : "删除"}
    </button>
  );
}
