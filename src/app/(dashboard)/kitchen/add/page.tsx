import Link from "next/link";
import { AddTabs } from "../_components/add-tabs";

export default function AddIngredientPage() {
  return (
    <div className="px-4 py-6 md:p-8 max-w-lg">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/kitchen"
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          ← 返回食材库
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-3">添加食材</h1>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 md:p-6">
        <AddTabs />
      </div>
    </div>
  );
}
