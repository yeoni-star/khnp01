"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

type PresetKey = "thisMonth" | "lastMonth" | "last3Months" | "last6Months" | "thisYear";

function getPresetRange(preset: PresetKey): { start: string; end: string } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();

  switch (preset) {
    case "thisMonth":
      return { start: fmt(new Date(Date.UTC(y, m, 1))), end: fmt(new Date(Date.UTC(y, m + 1, 0))) };
    case "lastMonth":
      return { start: fmt(new Date(Date.UTC(y, m - 1, 1))), end: fmt(new Date(Date.UTC(y, m, 0))) };
    case "last3Months":
      return { start: fmt(new Date(Date.UTC(y, m - 2, 1))), end: fmt(new Date(Date.UTC(y, m + 1, 0))) };
    case "last6Months":
      return { start: fmt(new Date(Date.UTC(y, m - 5, 1))), end: fmt(new Date(Date.UTC(y, m + 1, 0))) };
    case "thisYear":
      return { start: fmt(new Date(Date.UTC(y, 0, 1))), end: fmt(new Date(Date.UTC(y, 11, 31))) };
  }
}

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "thisMonth", label: "이번달" },
  { key: "lastMonth", label: "지난달" },
  { key: "last3Months", label: "최근 3개월" },
  { key: "last6Months", label: "최근 6개월" },
  { key: "thisYear", label: "올해" },
];

export default function QuickRangeButtons() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [month, setMonth] = useState("");

  function applyDates(start: string, end: string) {
    const params = new URLSearchParams(searchParams);
    params.set("start", start);
    params.set("end", end);
    router.push(`?${params.toString()}`);
  }

  function applyPreset(preset: PresetKey) {
    const { start, end } = getPresetRange(preset);
    applyDates(start, end);
  }

  function applyMonth() {
    if (!month) return;
    const [y, m] = month.split("-").map(Number);
    const start = fmt(new Date(Date.UTC(y, m - 1, 1)));
    const end = fmt(new Date(Date.UTC(y, m, 0)));
    applyDates(start, end);
  }

  return (
    <div className="col-span-2 flex flex-wrap items-center gap-2 sm:col-span-6">
      <span className="text-xs font-medium text-gray-500">빠른 선택:</span>
      {PRESETS.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={() => applyPreset(p.key)}
          className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer"
        >
          {p.label}
        </button>
      ))}
      <span className="mx-1 text-gray-300">|</span>
      <input
        type="month"
        value={month}
        onChange={(e) => setMonth(e.target.value)}
        className="rounded border border-gray-300 px-2 py-1 text-xs"
      />
      <button
        type="button"
        onClick={applyMonth}
        disabled={!month}
        className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
      >
        해당 월 적용
      </button>
    </div>
  );
}
