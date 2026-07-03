"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importConfirmedSlipsToLog, saveInspectionLog } from "@/actions/inspection-actions";
import type { InspectionColumn } from "@/lib/inspection";

type Row = {
  key: string;
  sourceItemId: string | null;
  itemName: string;
  unit: string;
  quantity: string;
  vendorName: string;
  values: Record<string, string>;
};

let rowKeySeq = 0;
function newRowKey() {
  rowKeySeq += 1;
  return `row-${rowKeySeq}`;
}

function emptyRow(): Row {
  return {
    key: newRowKey(),
    sourceItemId: null,
    itemName: "",
    unit: "",
    quantity: "",
    vendorName: "",
    values: {},
  };
}

function nextCheckValue(current: string | undefined): string {
  if (current === "O") return "X";
  if (current === "X") return "";
  return "O";
}

export default function InspectionLogTable({
  logId,
  dateStr,
  columns,
  initialInspectorName,
  initialRows,
}: {
  logId: string;
  dateStr: string;
  columns: InspectionColumn[];
  initialInspectorName: string;
  initialRows: {
    sourceItemId: string | null;
    itemName: string;
    unit: string;
    quantity: number;
    vendorName: string;
    values: Record<string, string>;
  }[];
}) {
  const router = useRouter();
  const [inspectorName, setInspectorName] = useState(initialInspectorName);
  const [rows, setRows] = useState<Row[]>(
    initialRows.length > 0
      ? initialRows.map((r) => ({
          key: newRowKey(),
          sourceItemId: r.sourceItemId,
          itemName: r.itemName,
          unit: r.unit,
          quantity: String(r.quantity),
          vendorName: r.vendorName,
          values: r.values,
        }))
      : [emptyRow()]
  );
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [importing, setImporting] = useState(false);

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function setCellValue(key: string, columnKey: string, value: string) {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, values: { ...r.values, [columnKey]: value } } : r))
    );
  }

  function fillColumn(columnKey: string, value: string) {
    setRows((prev) => prev.map((r) => ({ ...r, values: { ...r.values, [columnKey]: value } })));
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(key: string) {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((r) => r.key !== key)));
  }

  async function handleReimport() {
    setImporting(true);
    setMessage(null);
    const result = await importConfirmedSlipsToLog(logId);
    setImporting(false);
    if (!result.ok) {
      setMessage({ type: "error", text: result.message });
      return;
    }
    router.refresh();
  }

  function handleSave() {
    setMessage(null);
    const payload = rows
      .filter((r) => r.itemName.trim())
      .map((r) => ({
        sourceItemId: r.sourceItemId,
        itemName: r.itemName.trim(),
        unit: r.unit.trim(),
        quantity: Number(r.quantity) || 0,
        vendorName: r.vendorName.trim(),
        values: r.values,
      }));
    startTransition(async () => {
      const result = await saveInspectionLog(logId, inspectorName, JSON.stringify(payload));
      if (result.ok) {
        setMessage({ type: "success", text: "저장되었습니다." });
        router.refresh();
      } else {
        setMessage({ type: "error", text: result.message });
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-primary-200 bg-primary-50 px-3 py-2 text-xs text-primary-700">
        확정된 거래명세표만 자동으로 불러옵니다. 아직 확정하지 않은 거래명세표가 있다면 먼저 확정해 주세요.
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 rounded-md border border-gray-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">입고일자</label>
          <p className="text-sm font-medium text-gray-900">{dateStr}</p>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">검수자</label>
          <input
            value={inspectorName}
            onChange={(e) => setInspectorName(e.target.value)}
            placeholder="검수자명"
            className="w-40 rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={handleReimport}
          disabled={importing}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {importing ? "불러오는 중..." : "거래명세표 다시 불러오기"}
        </button>
      </div>

      <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500">
            <tr>
              <th className="px-2 py-2">품목명</th>
              <th className="px-2 py-2">단위</th>
              <th className="px-2 py-2">수량</th>
              <th className="px-2 py-2">납품업체</th>
              {columns.map((col) => (
                <th key={col.key} className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    <span>{col.label}</span>
                    {col.type === "CHECK" && (
                      <span className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => fillColumn(col.key, "O")}
                          className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-[11px] font-normal text-gray-600 hover:bg-gray-100"
                        >
                          전체 O
                        </button>
                        <button
                          type="button"
                          onClick={() => fillColumn(col.key, "X")}
                          className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-[11px] font-normal text-gray-600 hover:bg-gray-100"
                        >
                          전체 X
                        </button>
                      </span>
                    )}
                  </div>
                </th>
              ))}
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.key}>
                <td className="px-2 py-2">
                  <input
                    value={row.itemName}
                    onChange={(e) => updateRow(row.key, { itemName: e.target.value })}
                    className="w-32 rounded border border-gray-300 px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    value={row.unit}
                    onChange={(e) => updateRow(row.key, { unit: e.target.value })}
                    className="w-14 rounded border border-gray-300 px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    value={row.quantity}
                    onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                    className="w-16 rounded border border-gray-300 px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    value={row.vendorName}
                    onChange={(e) => updateRow(row.key, { vendorName: e.target.value })}
                    className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
                  />
                </td>
                {columns.map((col) => {
                  const value = row.values[col.key] ?? "";
                  if (col.type === "CHECK") {
                    return (
                      <td key={col.key} className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() => setCellValue(row.key, col.key, nextCheckValue(value))}
                          className={`h-8 w-10 rounded border text-sm font-semibold ${
                            value === "O"
                              ? "border-primary-300 bg-primary-50 text-primary-700"
                              : value === "X"
                              ? "border-red-300 bg-red-50 text-red-700"
                              : "border-gray-300 bg-white text-gray-300"
                          }`}
                        >
                          {value || "-"}
                        </button>
                      </td>
                    );
                  }
                  if (col.type === "DATE") {
                    return (
                      <td key={col.key} className="px-2 py-2">
                        <input
                          type="date"
                          value={value}
                          onChange={(e) => setCellValue(row.key, col.key, e.target.value)}
                          className="rounded border border-gray-300 px-2 py-1 text-sm"
                        />
                      </td>
                    );
                  }
                  if (col.type === "SELECT") {
                    return (
                      <td key={col.key} className="px-2 py-2">
                        <select
                          value={value}
                          onChange={(e) => setCellValue(row.key, col.key, e.target.value)}
                          className="rounded border border-gray-300 px-2 py-1 text-sm"
                        >
                          <option value="">선택</option>
                          {(col.options ?? []).map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </td>
                    );
                  }
                  return (
                    <td key={col.key} className="px-2 py-2">
                      <input
                        value={value}
                        onChange={(e) => setCellValue(row.key, col.key, e.target.value)}
                        className="w-28 rounded border border-gray-300 px-2 py-1 text-sm"
                      />
                    </td>
                  );
                })}
                <td className="px-2 py-2">
                  <button
                    type="button"
                    onClick={() => removeRow(row.key)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={addRow}
        className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
      >
        + 행 추가
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
