"use client";

import { useState, useEffect } from "react";

type Settings = {
  lunchStart: string;
  lunchEnd: string;
  dinnerStart: string;
  dinnerEnd: string;
};

const DEFAULT: Settings = {
  lunchStart: "11:00",
  lunchEnd: "13:30",
  dinnerStart: "17:00",
  dinnerEnd: "19:30",
};

export default function MealTimeSettingsPanel() {
  const [settings, setSettings] = useState<Settings>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/meal-time-settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setSettings(d.settings);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/meal-time-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage({ type: "success", text: "저장되었습니다." });
      } else {
        setMessage({ type: "error", text: data.message ?? "저장에 실패했습니다." });
      }
    } catch {
      setMessage({ type: "error", text: "저장 중 오류가 발생했습니다." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-md border border-gray-200 bg-white p-5 shadow-sm animate-pulse">
        <div className="h-4 bg-gray-100 rounded w-32 mb-4"></div>
        <div className="h-8 bg-gray-100 rounded"></div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-gray-900">식사 신청 시간 설정</h2>
      <div className="space-y-4">
        {/* 중식 */}
        <div>
          <p className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">중식</p>
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">시작</label>
              <input
                type="time"
                value={settings.lunchStart}
                onChange={(e) => setSettings((s) => ({ ...s, lunchStart: e.target.value }))}
                className="rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none"
              />
            </div>
            <span className="mt-5 text-gray-400">~</span>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">종료</label>
              <input
                type="time"
                value={settings.lunchEnd}
                onChange={(e) => setSettings((s) => ({ ...s, lunchEnd: e.target.value }))}
                className="rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 석식 */}
        <div>
          <p className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">석식</p>
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">시작</label>
              <input
                type="time"
                value={settings.dinnerStart}
                onChange={(e) => setSettings((s) => ({ ...s, dinnerStart: e.target.value }))}
                className="rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none"
              />
            </div>
            <span className="mt-5 text-gray-400">~</span>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">종료</label>
              <input
                type="time"
                value={settings.dinnerEnd}
                onChange={(e) => setSettings((s) => ({ ...s, dinnerEnd: e.target.value }))}
                className="rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
        {message && (
          <p className={`text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
