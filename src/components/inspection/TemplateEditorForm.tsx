"use client";

import { useState, useTransition } from "react";
import { saveInspectionTemplate } from "@/actions/inspection-actions";
import {
  INSPECTION_BASE_COLUMN_LABELS,
  INSPECTION_COLUMN_TYPES,
  INSPECTION_COLUMN_TYPE_LABELS,
  type InspectionColumnType,
} from "@/lib/inspection";

function sampleValueFor(type: InspectionColumnType, optionsText: string): string {
  if (type === "CHECK") return "O";
  if (type === "DATE") return "26.7.17";
  if (type === "SELECT") return optionsText.split(",").map((o) => o.trim()).filter(Boolean)[0] ?? "선택지1";
  return "예시값";
}

type ColumnRow = {
  key: string;
  label: string;
  type: InspectionColumnType;
  optionsText: string; // SELECT 타입일 때 콤마로 구분한 옵션 원문
};

let keySeq = 0;
function newKey() {
  keySeq += 1;
  return `col_${Date.now()}_${keySeq}`;
}

export default function TemplateEditorForm({
  restaurantLabel,
  initialColumns,
}: {
  restaurantLabel: string;
  initialColumns: { key: string; label: string; type: InspectionColumnType; options?: string[] }[];
}) {
  const [columns, setColumns] = useState<ColumnRow[]>(
    initialColumns.map((c) => ({
      key: c.key,
      label: c.label,
      type: c.type,
      optionsText: c.options?.join(", ") ?? "",
    }))
  );
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function updateColumn(key: string, patch: Partial<ColumnRow>) {
    setColumns((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  }

  function addColumn() {
    setColumns((prev) => [...prev, { key: newKey(), label: "", type: "TEXT", optionsText: "" }]);
  }

  function removeColumn(key: string) {
    setColumns((prev) => prev.filter((c) => c.key !== key));
  }

  function moveColumn(index: number, direction: -1 | 1) {
    setColumns((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function handleSave() {
    setMessage(null);
    const payload = columns.map((c) => ({
      key: c.key,
      label: c.label.trim(),
      type: c.type,
      options:
        c.type === "SELECT"
          ? c.optionsText
              .split(",")
              .map((o) => o.trim())
              .filter(Boolean)
          : undefined,
    }));
    if (payload.some((c) => !c.label)) {
      setMessage({ type: "error", text: "모든 컬럼에 이름을 입력해 주세요." });
      return;
    }
    startTransition(async () => {
      const result = await saveInspectionTemplate(JSON.stringify(payload));
      setMessage(
        result.ok
          ? { type: "success", text: "저장되었습니다." }
          : { type: "error", text: result.message }
      );
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        품목명 · 단위 · 수량 · 납품업체는 확정된 거래명세표에서 자동으로 채워지는 고정 컬럼입니다. 아래에서 그
        뒤에 붙는 검수 항목 컬럼을 {restaurantLabel} 기준으로 자유롭게 구성하세요.
      </p>

      <div>
        <p className="mb-1 text-xs font-medium text-gray-600">미리보기 — 실제 검수일지 화면은 이렇게 구성됩니다</p>
        <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500">
              <tr>
                {INSPECTION_BASE_COLUMN_LABELS.map((label) => (
                  <th key={label} className="whitespace-nowrap px-2 py-2">
                    {label}
                  </th>
                ))}
                {columns.map((col) => (
                  <th key={col.key} className="whitespace-nowrap border-l border-gray-200 px-2 py-2 text-primary-700">
                    {col.label || "(이름 없음)"}
                  </th>
                ))}
                {columns.length === 0 && (
                  <th className="whitespace-nowrap border-l border-dashed border-gray-300 px-2 py-2 text-gray-400">
                    + 아래에서 컬럼을 추가해 보세요
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-400">
              <tr>
                <td className="px-2 py-2">양파</td>
                <td className="px-2 py-2">kg</td>
                <td className="px-2 py-2">40</td>
                <td className="px-2 py-2">OO상사</td>
                {columns.map((col) => (
                  <td key={col.key} className="border-l border-gray-100 px-2 py-2">
                    {sampleValueFor(col.type, col.optionsText)}
                  </td>
                ))}
                {columns.length === 0 && <td className="border-l border-dashed border-gray-200 px-2 py-2" />}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3">
        {columns.map((col, index) => (
          <div key={col.key} className="rounded-md border border-gray-200 bg-white p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-start">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">컬럼 이름</label>
                <input
                  value={col.label}
                  onChange={(e) => updateColumn(col.key, { label: e.target.value })}
                  placeholder="예: 포장, 품질, 온도"
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">입력 방식</label>
                <select
                  value={col.type}
                  onChange={(e) => updateColumn(col.key, { type: e.target.value as InspectionColumnType })}
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                >
                  {INSPECTION_COLUMN_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {INSPECTION_COLUMN_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-1 sm:pt-5">
                <button
                  type="button"
                  onClick={() => moveColumn(index, -1)}
                  disabled={index === 0}
                  className="rounded border border-gray-300 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveColumn(index, 1)}
                  disabled={index === columns.length - 1}
                  className="rounded border border-gray-300 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeColumn(col.key)}
                  className="rounded border border-red-300 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50"
                >
                  삭제
                </button>
              </div>
            </div>
            {col.type === "SELECT" && (
              <div className="mt-2">
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  선택지 (콤마로 구분, 예: 합격, 불합격, 보류)
                </label>
                <input
                  value={col.optionsText}
                  onChange={(e) => updateColumn(col.key, { optionsText: e.target.value })}
                  placeholder="합격, 불합격, 보류"
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                />
              </div>
            )}
          </div>
        ))}
        {columns.length === 0 && (
          <p className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-400">
            아직 추가된 컬럼이 없습니다.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={addColumn}
        className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        + 컬럼 추가
      </button>

      {message && (
        <p className={`text-sm ${message.type === "error" ? "text-red-600" : "text-primary-600"}`}>
          {message.text}
        </p>
      )}

      <div>
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {pending ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}
