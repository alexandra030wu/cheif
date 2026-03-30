"use client";

import { useState } from "react";
import { AddIngredientForm } from "./add-form";
import { SmartInput } from "./smart-input";

type Tab = "manual" | "smart";

const tabs: { id: Tab; label: string }[] = [
  { id: "manual", label: "手动录入" },
  { id: "smart", label: "✨ 智能录入" },
];

export function AddTabs() {
  const [active, setActive] = useState<Tab>("manual");

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-gray-100 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              active === tab.id
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === "manual" ? <AddIngredientForm /> : <SmartInput />}
    </div>
  );
}
