"use client";

import { useTransition } from "react";
import { deleteIngredient } from "../actions";

export function DeleteButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => deleteIngredient(id))}
      className="text-xs text-red-400 hover:text-red-600 active:text-red-700 disabled:opacity-40 transition-colors px-2 py-1.5 -m-1.5"
    >
      {pending ? "删除中…" : "删除"}
    </button>
  );
}
