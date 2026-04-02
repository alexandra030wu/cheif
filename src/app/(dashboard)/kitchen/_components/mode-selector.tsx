"use client";

export type InputMode = "manual" | "voice" | "photo" | "video";

interface Props {
  onSelect: (mode: InputMode) => void;
}

const modes: {
  id: InputMode;
  icon: string;
  label: string;
  desc: string;
  enabled: boolean;
  badge?: string;
}[] = [
  {
    id: "manual",
    icon: "📝",
    label: "手动输入",
    desc: "不方便说话时，一个个添加",
    enabled: true,
  },
  {
    id: "voice",
    icon: "🎤",
    label: "语音添加",
    desc: "说出买的食材，自动识别",
    enabled: true,
    badge: "推荐",
  },
  {
    id: "photo",
    icon: "📷",
    label: "拍照识别",
    desc: "拍张照片，自动识别食材",
    enabled: false,
  },
  {
    id: "video",
    icon: "📹",
    label: "视频录入",
    desc: "打开冰箱录一段，AI 帮你整理",
    enabled: false,
  },
];

export function ModeSelector({ onSelect }: Props) {
  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">选择添加方式</p>
      <div className="grid grid-cols-2 gap-3">
        {modes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            disabled={!mode.enabled}
            onClick={() => mode.enabled && onSelect(mode.id)}
            className={`relative rounded-xl border p-4 text-left transition-colors ${
              mode.enabled
                ? "border-gray-200 bg-white hover:border-gray-300 active:bg-gray-50 cursor-pointer"
                : "border-gray-100 bg-gray-50/50 cursor-not-allowed opacity-60"
            }`}
          >
            {/* Badge */}
            {mode.badge && (
              <span className="absolute top-2 right-2 rounded-full bg-amber-100 text-amber-700 px-1.5 py-0.5 text-[10px] font-medium">
                {mode.badge}
              </span>
            )}

            <span className="text-2xl block mb-2">{mode.icon}</span>
            <p className="text-sm font-medium text-gray-900 mb-0.5">{mode.label}</p>
            <p className="text-xs text-gray-400 leading-snug">
              {mode.enabled ? mode.desc : "即将推出"}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
