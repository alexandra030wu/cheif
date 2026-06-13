"use client";

import { useState } from "react";
import { saveProfile, type ProfileData } from "../actions";

const AVATAR_EMOJIS = ["🧑‍🍳", "👨‍🍳", "👩‍🍳", "🍳", "🥘", "🍜", "🥗", "🍕", "🍣", "🧁", "🐱", "🐶"];

const SERVINGS_OPTIONS = [
  { value: "1人食", label: "1人食" },
  { value: "2人食", label: "2人食" },
  { value: "一家三口", label: "一家三口" },
  { value: "聚餐4-6人", label: "聚餐4-6人" },
];

const DIETARY_OPTIONS = ["素食", "清真", "无麸质", "低碳水", "低脂", "无乳糖"];

const ALLERGY_OPTIONS = ["花生", "坚果", "海鲜", "鸡蛋", "牛奶", "大豆", "小麦", "芝麻"];

const COOKING_LEVELS = [
  { value: "beginner", label: "新手", desc: "会煮面、炒蛋" },
  { value: "intermediate", label: "进阶", desc: "能做家常菜" },
  { value: "expert", label: "大厨", desc: "复杂菜式也能搞定" },
];

const EQUIPMENT_OPTIONS = ["烤箱", "空气炸锅", "微波炉", "电饭煲", "面包机", "搅拌机", "蒸锅"];

const MODEL_OPTIONS: Array<{ value: "claude" | "deepseek"; label: string; desc: string }> = [
  { value: "claude", label: "Claude", desc: "默认，回复更稳更自然" },
  { value: "deepseek", label: "DeepSeek V4", desc: "国产模型，速度快、更省" },
];

const sectionTitle = "text-sm font-semibold text-gray-900 mb-3";

interface Props {
  initial: ProfileData;
}

function toggleInArray(arr: string[], item: string) {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

export function SettingsForm({ initial }: Props) {
  const [avatar, setAvatar] = useState(initial.avatar_url || "🧑‍🍳");
  const [nickname, setNickname] = useState(initial.nickname || "");
  const [servings, setServings] = useState(initial.default_servings || "1人食");
  const [dietary, setDietary] = useState<string[]>(initial.dietary_preferences || []);
  const [allergies, setAllergies] = useState<string[]>(initial.allergies || []);
  const [level, setLevel] = useState(initial.cooking_level || "beginner");
  const [equipment, setEquipment] = useState<string[]>(initial.kitchen_equipment || []);
  const [aiModel, setAiModel] = useState<"claude" | "deepseek">(
    initial.ai_model_preference || "claude"
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);

    const result = await saveProfile({
      nickname,
      avatar_url: avatar,
      default_servings: servings,
      dietary_preferences: dietary,
      allergies,
      cooking_level: level,
      kitchen_equipment: equipment,
      ai_model_preference: aiModel,
    });

    setSaving(false);
    if (result.status === "error") {
      setError(result.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Avatar + Nickname */}
      <section>
        <h2 className={sectionTitle}>头像和昵称</h2>
        <div className="flex items-center gap-4 mb-3">
          <span className="text-4xl">{avatar}</span>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="输入昵称"
            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-base text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none transition-colors"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {AVATAR_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setAvatar(e)}
              className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-colors ${
                avatar === e
                  ? "bg-gray-900 ring-2 ring-gray-900 ring-offset-2"
                  : "bg-gray-100 hover:bg-gray-200 active:bg-gray-300"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </section>

      {/* Default Servings */}
      <section>
        <h2 className={sectionTitle}>几人份？</h2>
        <div className="grid grid-cols-2 gap-2">
          {SERVINGS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setServings(opt.value)}
              className={`rounded-xl py-3 text-sm font-medium transition-colors ${
                servings === opt.value
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Dietary Preferences */}
      <section>
        <h2 className={sectionTitle}>饮食偏好</h2>
        <div className="flex flex-wrap gap-2">
          {DIETARY_OPTIONS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setDietary(toggleInArray(dietary, item))}
              className={`rounded-full px-4 py-2 text-sm transition-colors ${
                dietary.includes(item)
                  ? "bg-green-100 text-green-800 font-medium"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {dietary.includes(item) ? "✓ " : ""}
              {item}
            </button>
          ))}
        </div>
      </section>

      {/* Allergies */}
      <section>
        <h2 className={sectionTitle}>过敏原</h2>
        <p className="text-xs text-gray-400 mb-2">选中后 AI 会自动避开这些食材</p>
        <div className="flex flex-wrap gap-2">
          {ALLERGY_OPTIONS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setAllergies(toggleInArray(allergies, item))}
              className={`rounded-full px-4 py-2 text-sm transition-colors ${
                allergies.includes(item)
                  ? "bg-red-100 text-red-800 font-medium"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {allergies.includes(item) ? "✗ " : ""}
              {item}
            </button>
          ))}
        </div>
      </section>

      {/* Cooking Level */}
      <section>
        <h2 className={sectionTitle}>厨艺水平</h2>
        <div className="space-y-2">
          {COOKING_LEVELS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setLevel(opt.value)}
              className={`w-full flex items-center justify-between rounded-xl px-4 py-3 text-left transition-colors ${
                level === opt.value
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <span className="text-sm font-medium">{opt.label}</span>
              <span className={`text-xs ${level === opt.value ? "text-gray-300" : "text-gray-400"}`}>
                {opt.desc}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Kitchen Equipment */}
      <section>
        <h2 className={sectionTitle}>常用厨具</h2>
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT_OPTIONS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setEquipment(toggleInArray(equipment, item))}
              className={`rounded-full px-4 py-2 text-sm transition-colors ${
                equipment.includes(item)
                  ? "bg-blue-100 text-blue-800 font-medium"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {equipment.includes(item) ? "✓ " : ""}
              {item}
            </button>
          ))}
        </div>
      </section>

      {/* AI Model */}
      <section>
        <h2 className={sectionTitle}>AI 模型</h2>
        <p className="text-xs text-gray-400 mb-3">选择驱动聊天和菜谱的大模型。不确定就用默认的 Claude。</p>
        <div className="space-y-2">
          {MODEL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setAiModel(opt.value)}
              className={`w-full flex items-center justify-between rounded-xl px-4 py-3 text-left transition-colors ${
                aiModel === opt.value
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <span className="text-sm font-medium">{opt.label}</span>
              <span className={`text-xs ${aiModel === opt.value ? "text-gray-300" : "text-gray-400"}`}>
                {opt.desc}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Save */}
      {error && (
        <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className={`w-full rounded-xl py-3.5 text-sm font-medium transition-colors ${
          saved
            ? "bg-green-50 text-green-700 border border-green-200"
            : "bg-gray-900 text-white hover:bg-gray-700 active:bg-gray-800 disabled:opacity-50"
        }`}
      >
        {saved ? "已保存" : saving ? "保存中..." : "保存设置"}
      </button>
    </div>
  );
}
