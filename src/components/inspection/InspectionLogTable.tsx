"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PrintButton from "@/components/reports/PrintButton";
import DeleteInspectionLogButton from "@/components/inspection/DeleteInspectionLogButton";
import {
  confirmInspectionLog,
  importConfirmedSlipsToLog,
  reopenInspectionLog,
  saveInspectionLog,
} from "@/actions/inspection-actions";
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

const WIDTH_STEP = 8;
const MIN_COL_WIDTH = 24;
type FixedColumn = "name" | "unit" | "qty" | "vendor";
const DEFAULT_FIXED_WIDTHS: Record<FixedColumn, number> = {
  name: 140,
  unit: 48,
  qty: 56,
  vendor: 88,
};

function defaultWidthForColumn(column: InspectionColumn): number {
  if (column.type === "CHECK") return 56;
  if (column.type === "DATE") return 112;
  return 96;
}

function buildDefaultColWidths(columns: InspectionColumn[]): Record<string, number> {
  const widths: Record<string, number> = { ...DEFAULT_FIXED_WIDTHS };
  for (const col of columns) {
    widths[col.key] = defaultWidthForColumn(col);
  }
  return widths;
}

function ColumnResizeButtons({ onDecrease, onIncrease }: { onDecrease: () => void; onIncrease: () => void }) {
  return (
    <span className="flex items-center gap-0.5 print:hidden">
      <button
        type="button"
        onClick={onDecrease}
        className="flex h-4 w-4 items-center justify-center rounded bg-gray-200 text-xs text-gray-600 hover:bg-gray-300"
      >
        -
      </button>
      <button
        type="button"
        onClick={onIncrease}
        className="flex h-4 w-4 items-center justify-center rounded bg-gray-200 text-xs text-gray-600 hover:bg-gray-300"
      >
        +
      </button>
    </span>
  );
}

let rowKeySeq = 0;
function newRowKey() {
  rowKeySeq += 1;
  return `row-${rowKeySeq}`;
}

function nextCheckValue(current: string | undefined): string {
  if (current === "O") return "X";
  if (current === "X") return "";
  return "O";
}

export default function InspectionLogTable({
  logId,
  dateStr,
  status,
  columns,
  initialInspectorName,
  initialRows,
}: {
  logId: string;
  dateStr: string;
  status: "DRAFT" | "CONFIRMED";
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
  const readOnly = status === "CONFIRMED";
  const [inspectorName, setInspectorName] = useState(initialInspectorName);
  const [rows, setRows] = useState<Row[]>(
    initialRows.map((r) => ({
      key: newRowKey(),
      sourceItemId: r.sourceItemId,
      itemName: r.itemName,
      unit: r.unit,
      quantity: String(r.quantity),
      vendorName: r.vendorName,
      values: r.values,
    }))
  );
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => buildDefaultColWidths(columns));
  const [bulkInputs, setBulkInputs] = useState<Record<string, string>>({});

  function adjustWidth(key: string, delta: number) {
    setColWidths((prev) => ({
      ...prev,
      [key]: Math.max(MIN_COL_WIDTH, (prev[key] ?? 96) + delta),
    }));
  }

  function setCellValue(key: string, columnKey: string, value: string) {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, values: { ...r.values, [columnKey]: value } } : r))
    );
  }

  function fillColumn(columnKey: string, value: string) {
    setRows((prev) => prev.map((r) => ({ ...r, values: { ...r.values, [columnKey]: value } })));
  }

  function applyBulkValue(columnKey: string) {
    const value = bulkInputs[columnKey] ?? "";
    if (!value) return;
    fillColumn(columnKey, value);
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

  function buildPayload() {
    return rows
      .filter((r) => r.itemName.trim())
      .map((r) => ({
        sourceItemId: r.sourceItemId,
        itemName: r.itemName.trim(),
        unit: r.unit.trim(),
        quantity: Number(r.quantity) || 0,
        vendorName: r.vendorName.trim(),
        values: r.values,
      }));
  }

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await saveInspectionLog(logId, inspectorName, JSON.stringify(buildPayload()));
      if (result.ok) {
        setMessage({ type: "success", text: "저장되었습니다." });
        router.refresh();
      } else {
        setMessage({ type: "error", text: result.message });
      }
    });
  }

  function handleConfirm() {
    if (!confirm("이 검수일지를 확정할까요? 확정 후에는 '수정'을 눌러야 다시 편집할 수 있습니다.")) return;
    setMessage(null);
    startTransition(async () => {
      const saveResult = await saveInspectionLog(logId, inspectorName, JSON.stringify(buildPayload()));
      if (!saveResult.ok) {
        setMessage({ type: "error", text: saveResult.message });
        return;
      }
      const result = await confirmInspectionLog(logId);
      if (result.ok) {
        router.refresh();
      } else {
        setMessage({ type: "error", text: result.message });
      }
    });
  }

  async function handleExport() {
    setMessage(null);
    setExporting(true);
    try {
      if (!readOnly) {
        const result = await saveInspectionLog(logId, inspectorName, JSON.stringify(buildPayload()));
        if (!result.ok) {
          setMessage({ type: "error", text: result.message });
          return;
        }
      }
      window.location.href = `/api/inspection/export?date=${dateStr}`;
    } finally {
      setExporting(false);
    }
  }

  function handleReopen() {
    if (!confirm("확정을 취소하고 다시 편집할 수 있게 할까요?")) return;
    setMessage(null);
    startTransition(async () => {
      const result = await reopenInspectionLog(logId);
      if (result.ok) {
        router.refresh();
      } else {
        setMessage({ type: "error", text: result.message });
      }
    });
  }

  const statusActions = readOnly ? (
    <button
      type="button"
      onClick={handleReopen}
      disabled={pending}
      className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
    >
      {pending ? "처리 중..." : "수정"}
    </button>
  ) : (
    <>
      <button
        type="button"
        onClick={handleSave}
        disabled={pending}
        className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {pending ? "저장 중..." : "저장"}
      </button>
      <button
        type="button"
        onClick={handleConfirm}
        disabled={pending}
        className="rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
      >
        {pending ? "처리 중..." : "확정"}
      </button>
    </>
  );

  return (
    <div className="space-y-4 print:mx-auto print:max-w-[210mm]">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <h1 className="text-lg font-semibold text-gray-900">식재료 검수일지 - {dateStr}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <PrintButton />
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {exporting ? "내보내는 중..." : "엑셀로 내보내기"}
          </button>
          {statusActions}
          <DeleteInspectionLogButton logId={logId} />
        </div>
      </div>
      <h1 className="hidden text-2xl font-semibold text-gray-900 print:block">식재료 검수일지</h1>

      {columns.length === 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 print:hidden">
          아직 검수 항목이 설정되지 않았습니다.{" "}
          <Link href="/inspection/template" className="font-medium underline">
            양식 설정
          </Link>
          에서 검수할 컬럼을 먼저 추가해 주세요.
        </div>
      )}

      {readOnly ? (
        <div className="rounded-md border border-primary-200 bg-primary-50 px-3 py-2 text-xs font-medium text-primary-700 print:hidden">
          확정된 검수일지입니다. 수정하려면 아래 &apos;수정&apos; 버튼을 눌러 확정을 취소해 주세요.
        </div>
      ) : (
        <div className="rounded-md border border-primary-200 bg-primary-50 px-3 py-2 text-xs text-primary-700 print:hidden">
          확정된 거래명세표만 자동으로 불러옵니다. 아직 확정하지 않은 거래명세표가 있다면 먼저 확정해 주세요.
        </div>
      )}

      <p className="hidden text-sm text-gray-900 print:block">
        입고일자: {dateStr} · 검수자: {inspectorName || "-"} (인)
      </p>

      <div className="flex flex-wrap items-end justify-between gap-3 rounded-md border border-gray-200 bg-white p-4 print:hidden">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">입고일자</label>
          <p className="text-sm font-medium text-gray-900">{dateStr}</p>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">검수자</label>
          {readOnly ? (
            <p className="text-sm font-medium text-gray-900">{inspectorName || "-"}</p>
          ) : (
            <input
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              placeholder="검수자명"
              className="w-40 rounded border border-gray-300 px-2 py-1.5 text-sm"
            />
          )}
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={handleReimport}
            disabled={importing}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {importing ? "불러오는 중..." : "거래명세표 다시 불러오기"}
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-md border border-gray-200 bg-white print:overflow-visible print:rounded-none print:border-0">
        <table className="w-full min-w-max table-fixed border-collapse text-sm print:text-[10px]">
          <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 print:text-[10px]">
            <tr>
              <th className="border border-gray-300 px-2 py-2 align-top print:px-1 print:py-0.5" style={{ width: colWidths.name }}>
                <div className="flex items-center justify-between gap-2">
                  <span>품목명</span>
                  {!readOnly && (
                    <ColumnResizeButtons
                      onDecrease={() => adjustWidth("name", -WIDTH_STEP)}
                      onIncrease={() => adjustWidth("name", WIDTH_STEP)}
                    />
                  )}
                </div>
              </th>
              <th className="border border-gray-300 px-2 py-2 align-top print:px-1 print:py-0.5" style={{ width: colWidths.unit }}>
                <div className="flex items-center justify-between gap-2">
                  <span>단위</span>
                  {!readOnly && (
                    <ColumnResizeButtons
                      onDecrease={() => adjustWidth("unit", -WIDTH_STEP)}
                      onIncrease={() => adjustWidth("unit", WIDTH_STEP)}
                    />
                  )}
                </div>
              </th>
              <th className="border border-gray-300 px-2 py-2 align-top print:px-1 print:py-0.5" style={{ width: colWidths.qty }}>
                <div className="flex items-center justify-between gap-2">
                  <span>수량</span>
                  {!readOnly && (
                    <ColumnResizeButtons
                      onDecrease={() => adjustWidth("qty", -WIDTH_STEP)}
                      onIncrease={() => adjustWidth("qty", WIDTH_STEP)}
                    />
                  )}
                </div>
              </th>
              <th className="border border-gray-300 px-2 py-2 align-top print:px-1 print:py-0.5" style={{ width: colWidths.vendor }}>
                <div className="flex items-center justify-between gap-2">
                  <span>납품업체</span>
                  {!readOnly && (
                    <ColumnResizeButtons
                      onDecrease={() => adjustWidth("vendor", -WIDTH_STEP)}
                      onIncrease={() => adjustWidth("vendor", WIDTH_STEP)}
                    />
                  )}
                </div>
              </th>
              {columns.map((col) => (
                <th key={col.key} className="border border-gray-300 px-2 py-2 align-top print:px-1 print:py-0.5" style={{ width: colWidths[col.key] }}>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span>{col.label}</span>
                      {!readOnly && (
                        <ColumnResizeButtons
                          onDecrease={() => adjustWidth(col.key, -WIDTH_STEP)}
                          onIncrease={() => adjustWidth(col.key, WIDTH_STEP)}
                        />
                      )}
                    </div>
                    {col.type === "CHECK" && !readOnly && (
                      <span className="flex gap-1 print:hidden">
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
                    {col.type === "DATE" && !readOnly && (
                      <span className="flex items-center gap-1 print:hidden">
                        <input
                          type="date"
                          value={bulkInputs[col.key] ?? ""}
                          onChange={(e) => setBulkInputs((prev) => ({ ...prev, [col.key]: e.target.value }))}
                          className="w-full min-w-0 rounded border border-gray-300 px-1 py-0.5 text-[11px] font-normal text-gray-700"
                        />
                        <button
                          type="button"
                          onClick={() => applyBulkValue(col.key)}
                          className="shrink-0 rounded border border-gray-300 bg-white px-1.5 py-0.5 text-[11px] font-normal text-gray-600 hover:bg-gray-100"
                        >
                          일괄적용
                        </button>
                      </span>
                    )}
                    {col.type === "TEXT" && !readOnly && (
                      <span className="flex items-center gap-1 print:hidden">
                        <input
                          type="text"
                          value={bulkInputs[col.key] ?? ""}
                          onChange={(e) => setBulkInputs((prev) => ({ ...prev, [col.key]: e.target.value }))}
                          placeholder="값"
                          className="w-full min-w-0 rounded border border-gray-300 px-1 py-0.5 text-[11px] font-normal text-gray-700"
                        />
                        <button
                          type="button"
                          onClick={() => applyBulkValue(col.key)}
                          className="shrink-0 rounded border border-gray-300 bg-white px-1.5 py-0.5 text-[11px] font-normal text-gray-600 hover:bg-gray-100"
                        >
                          일괄적용
                        </button>
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {!readOnly && <th className="border border-gray-300 px-2 py-2 print:hidden" style={{ width: 48 }} />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={5 + columns.length} className="border border-gray-300 px-2 py-6 text-center text-sm text-gray-400">
                  확정된 거래명세표 품목이 없습니다. 거래명세표를 먼저 확정해 주세요.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.key}>
                <td className="break-words border border-gray-300 px-2 py-2 text-gray-900 print:px-1 print:py-0.5" style={{ width: colWidths.name }}>
                  {row.itemName}
                </td>
                <td className="border border-gray-300 px-2 py-2 text-gray-600 print:px-1 print:py-0.5" style={{ width: colWidths.unit }}>
                  {row.unit}
                </td>
                <td className="border border-gray-300 px-2 py-2 text-gray-600 print:px-1 print:py-0.5" style={{ width: colWidths.qty }}>
                  {row.quantity}
                </td>
                <td className="break-words border border-gray-300 px-2 py-2 text-gray-600 print:px-1 print:py-0.5" style={{ width: colWidths.vendor }}>
                  {row.vendorName}
                </td>
                {columns.map((col) => {
                  const value = row.values[col.key] ?? "";
                  const width = colWidths[col.key];
                  if (readOnly) {
                    return (
                      <td key={col.key} className="border border-gray-300 px-2 py-2 text-gray-700 print:px-1 print:py-0.5" style={{ width }}>
                        {value || "-"}
                      </td>
                    );
                  }
                  if (col.type === "CHECK") {
                    return (
                      <td key={col.key} className="border border-gray-300 px-2 py-2 print:px-1 print:py-0.5" style={{ width }}>
                        <button
                          type="button"
                          onClick={() => setCellValue(row.key, col.key, nextCheckValue(value))}
                          className={`h-8 w-10 rounded border text-sm font-semibold print:hidden ${
                            value === "O"
                              ? "border-primary-300 bg-primary-50 text-primary-700"
                              : value === "X"
                              ? "border-red-300 bg-red-50 text-red-700"
                              : "border-gray-300 bg-white text-gray-300"
                          }`}
                        >
                          {value || "-"}
                        </button>
                        <span className="hidden print:inline">{value || "-"}</span>
                      </td>
                    );
                  }
                  if (col.type === "DATE") {
                    return (
                      <td key={col.key} className="border border-gray-300 px-2 py-2 print:px-1 print:py-0.5" style={{ width }}>
                        <input
                          type="date"
                          value={value}
                          onChange={(e) => setCellValue(row.key, col.key, e.target.value)}
                          className="w-full min-w-0 rounded border border-gray-300 px-2 py-1 text-sm print:hidden"
                        />
                        <span className="hidden print:inline">{value || "-"}</span>
                      </td>
                    );
                  }
                  if (col.type === "SELECT") {
                    return (
                      <td key={col.key} className="border border-gray-300 px-2 py-2 print:px-1 print:py-0.5" style={{ width }}>
                        <select
                          value={value}
                          onChange={(e) => setCellValue(row.key, col.key, e.target.value)}
                          className="w-full min-w-0 rounded border border-gray-300 px-2 py-1 text-sm print:hidden"
                        >
                          <option value="">선택</option>
                          {(col.options ?? []).map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                        <span className="hidden print:inline">{value || "-"}</span>
                      </td>
                    );
                  }
                  return (
                    <td key={col.key} className="border border-gray-300 px-2 py-2 print:px-1 print:py-0.5" style={{ width }}>
                      <input
                        value={value}
                        onChange={(e) => setCellValue(row.key, col.key, e.target.value)}
                        className="w-full min-w-0 rounded border border-gray-300 px-2 py-1 text-sm print:hidden"
                      />
                      <span className="hidden print:inline">{value || "-"}</span>
                    </td>
                  );
                })}
                {!readOnly && (
                  <td className="border border-gray-300 px-2 py-2 print:hidden">
                    <button
                      type="button"
                      onClick={() => removeRow(row.key)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      삭제
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {message && (
        <p
          className={`text-sm print:hidden ${message.type === "error" ? "text-red-600" : "text-primary-600"}`}
        >
          {message.text}
        </p>
      )}

      <div className="flex gap-2 print:hidden">{statusActions}</div>
    </div>
  );
}
