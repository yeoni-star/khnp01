"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSlipDraft, confirmSlip } from "@/actions/slip-actions";
import { CATEGORIES, CATEGORY_LABELS, type CategoryCode } from "@/lib/categories";
import { findSimilarItem } from "@/lib/item-matching";

type ContractItemOption = {
  id: string;
  itemName: string;
  category: CategoryCode;
  unit: string;
  unitPrice: number;
};

type MatchType = "EXACT" | "FUZZY_CONFIRMED" | "NONE";

type Row = {
  key: string;
  itemName: string;
  category: CategoryCode | "";
  unit: string;
  quantity: string;
  unitPrice: string;
  matchedContractItemId: string | null;
  matchType: MatchType;
  priceOverridden: boolean;
  suggestion: { item: ContractItemOption; score: number } | null;
};

let rowKeySeq = 0;
function newRowKey() {
  rowKeySeq += 1;
  return `row-${rowKeySeq}`;
}

function emptyRow(): Row {
  return {
    key: newRowKey(),
    itemName: "",
    category: "",
    unit: "",
    quantity: "",
    unitPrice: "",
    matchedContractItemId: null,
    matchType: "NONE",
    priceOverridden: false,
    suggestion: null,
  };
}

function normalize(s: string) {
  return s.trim().toLowerCase();
}

function matchRow(
  itemName: string,
  quantity: number,
  ocrUnit: string,
  ocrUnitPrice: number,
  contractItems: ContractItemOption[]
): Row {
  const normalized = normalize(itemName);
  const exact = contractItems.find((c) => normalize(c.itemName) === normalized);
  if (exact) {
    return {
      key: newRowKey(),
      itemName,
      category: exact.category,
      unit: exact.unit,
      quantity: String(quantity),
      unitPrice: String(exact.unitPrice),
      matchedContractItemId: exact.id,
      matchType: "EXACT",
      priceOverridden: false,
      suggestion: null,
    };
  }
  const similar = findSimilarItem(itemName, contractItems);
  return {
    key: newRowKey(),
    itemName,
    category: "",
    unit: ocrUnit,
    quantity: String(quantity),
    unitPrice: String(ocrUnitPrice || 0),
    matchedContractItemId: null,
    matchType: "NONE",
    priceOverridden: false,
    suggestion: similar,
  };
}

type OcrDraftItem = {
  itemName: string;
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
};

export default function SlipItemsTable({
  slipId,
  status,
  contractItems,
  initialItems,
}: {
  slipId: string;
  status: "DRAFT" | "CONFIRMED";
  contractItems: ContractItemOption[];
  initialItems: {
    itemName: string;
    category: CategoryCode | null;
    unit: string;
    quantity: number;
    unitPrice: number;
    matchedContractItemId: string | null;
    matchType: MatchType;
    priceOverridden: boolean;
  }[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(
    initialItems.length > 0
      ? initialItems.map((i) => ({
          key: newRowKey(),
          itemName: i.itemName,
          category: i.category ?? "",
          unit: i.unit,
          quantity: String(i.quantity),
          unitPrice: String(i.unitPrice),
          matchedContractItemId: i.matchedContractItemId,
          matchType: i.matchType,
          priceOverridden: i.priceOverridden,
          suggestion: null,
        }))
      : [emptyRow()]
  );
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [ocrPending, setOcrPending] = useState(false);
  const [ocrNote, setOcrNote] = useState<string | null>(null);
  const readOnly = status === "CONFIRMED";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingApiKeyRef = useRef<string>("");

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function handleUploadClick() {
    const apiKey = window.prompt("Anthropic API 키를 입력해 주세요. (업로드할 때마다 새로 입력해야 합니다)");
    if (!apiKey || !apiKey.trim()) {
      setMessage({ type: "error", text: "API 키를 입력해야 업로드할 수 있습니다." });
      return;
    }
    pendingApiKeyRef.current = apiKey.trim();
    fileInputRef.current?.click();
  }

  async function handleFileUpload(file: File) {
    const apiKey = pendingApiKeyRef.current;
    pendingApiKeyRef.current = "";
    if (!apiKey) {
      setMessage({ type: "error", text: "API 키를 입력해야 업로드할 수 있습니다." });
      return;
    }
    setOcrPending(true);
    setOcrNote(null);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("apiKey", apiKey);
      const res = await fetch(`/api/slips/${slipId}/ocr`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMessage({ type: "error", text: data.message ?? "인식에 실패했습니다. 직접 입력해 주세요." });
        return;
      }
      const items = (data.items as OcrDraftItem[]) ?? [];
      if (items.length > 0) {
        setRows(
          items.map((item) =>
            matchRow(item.itemName, item.quantity ?? 0, item.unit ?? "", item.unitPrice ?? 0, contractItems)
          )
        );
      }
      const noteParts: string[] = [];
      if (data.vendorNameGuess) noteParts.push(`업체 추정: ${data.vendorNameGuess}`);
      if (data.deliveryDateGuess) noteParts.push(`날짜 추정: ${data.deliveryDateGuess}`);
      if (data.notes) noteParts.push(data.notes);
      setOcrNote(noteParts.length > 0 ? noteParts.join(" · ") : null);
      setMessage({ type: "success", text: `${items.length}개 품목을 인식했습니다. 검수 후 저장해 주세요.` });
    } catch {
      setMessage({ type: "error", text: "업로드 중 오류가 발생했습니다. 직접 입력해 주세요." });
    } finally {
      setOcrPending(false);
    }
  }

  function handleItemNameBlur(key: string, value: string) {
    const normalized = normalize(value);
    if (!normalized) return;

    const exact = contractItems.find((c) => normalize(c.itemName) === normalized);
    if (exact) {
      updateRow(key, {
        category: exact.category,
        unit: exact.unit,
        unitPrice: String(exact.unitPrice),
        matchedContractItemId: exact.id,
        matchType: "EXACT",
        priceOverridden: false,
        suggestion: null,
      });
      return;
    }

    const similar = findSimilarItem(value, contractItems);
    updateRow(key, { suggestion: similar, matchType: "NONE", matchedContractItemId: null });
  }

  function acceptSuggestion(key: string) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== key || !r.suggestion) return r;
        const item = r.suggestion.item;
        return {
          ...r,
          category: item.category,
          unit: item.unit,
          unitPrice: String(item.unitPrice),
          matchedContractItemId: item.id,
          matchType: "FUZZY_CONFIRMED" as const,
          priceOverridden: false,
          suggestion: null,
        };
      })
    );
  }

  function rejectSuggestion(key: string) {
    updateRow(key, { suggestion: null, matchType: "NONE", matchedContractItemId: null });
  }

  function handlePriceChange(key: string, value: string) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r;
        const matched = contractItems.find((c) => c.id === r.matchedContractItemId);
        const overridden = matched ? String(matched.unitPrice) !== value : r.priceOverridden;
        return { ...r, unitPrice: value, priceOverridden: overridden };
      })
    );
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(key: string) {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((r) => r.key !== key)));
  }

  function buildItemsJson() {
    return JSON.stringify(
      rows
        .filter((r) => r.itemName.trim())
        .map((r) => ({
          itemName: r.itemName.trim(),
          category: r.category || null,
          unit: r.unit.trim(),
          quantity: Number(r.quantity) || 0,
          unitPrice: Number(r.unitPrice) || 0,
          matchedContractItemId: r.matchedContractItemId,
          matchType: r.matchType,
          priceOverridden: r.priceOverridden,
        }))
    );
  }

  function handleSaveDraft() {
    setMessage(null);
    startTransition(async () => {
      const result = await saveSlipDraft(slipId, buildItemsJson());
      if (result.ok) {
        setMessage({ type: "success", text: "임시저장되었습니다." });
      } else {
        setMessage({ type: "error", text: result.message });
      }
    });
  }

  function handleConfirm() {
    setMessage(null);
    startTransition(async () => {
      const result = await confirmSlip(slipId, buildItemsJson());
      if (result.ok) {
        router.push("/slips");
      } else {
        setMessage({ type: "error", text: result.message });
      }
    });
  }

  const total = rows.reduce((sum, r) => sum + (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0), 0);

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="rounded-md border border-gray-200 bg-white p-4">
          <label className="mb-1 block text-xs font-medium text-gray-600">영수증 업로드 (PDF/JPG/PNG)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            disabled={ocrPending}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFileUpload(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={handleUploadClick}
            disabled={ocrPending}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {ocrPending ? "인식 중..." : "파일 선택 (API 키 입력 필요)"}
          </button>
          {ocrNote && <p className="mt-1 text-xs text-gray-500">{ocrNote}</p>}
        </div>
      )}

      <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500">
            <tr>
              <th className="px-2 py-2">품명</th>
              <th className="px-2 py-2">카테고리</th>
              <th className="px-2 py-2">단위</th>
              <th className="px-2 py-2">수량</th>
              <th className="px-2 py-2">단가</th>
              <th className="px-2 py-2">금액</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => {
              const amount = (Number(row.quantity) || 0) * (Number(row.unitPrice) || 0);
              return (
                <tr key={row.key} className="align-top">
                  <td className="px-2 py-2">
                    <input
                      value={row.itemName}
                      disabled={readOnly}
                      onChange={(e) => updateRow(row.key, { itemName: e.target.value })}
                      onBlur={(e) => handleItemNameBlur(row.key, e.target.value)}
                      className="w-40 rounded border border-gray-300 px-2 py-1 text-sm disabled:bg-gray-100"
                    />
                    {row.matchType === "EXACT" && (
                      <p className="mt-1 text-xs text-blue-600">계약단가 적용</p>
                    )}
                    {row.matchType === "FUZZY_CONFIRMED" && (
                      <p className="mt-1 text-xs text-blue-600">유사품목 확인 · 계약단가 적용</p>
                    )}
                    {row.suggestion && (
                      <div className="mt-1 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-800">
                        <p>혹시 &apos;{row.suggestion.item.itemName}&apos; 아닌가요?</p>
                        <div className="mt-1 flex gap-2">
                          <button
                            type="button"
                            onClick={() => acceptSuggestion(row.key)}
                            className="rounded bg-amber-600 px-2 py-0.5 text-white hover:bg-amber-700"
                          >
                            예
                          </button>
                          <button
                            type="button"
                            onClick={() => rejectSuggestion(row.key)}
                            className="rounded border border-amber-400 px-2 py-0.5 text-amber-700 hover:bg-amber-100"
                          >
                            아니오
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={row.category}
                      disabled={readOnly}
                      onChange={(e) => updateRow(row.key, { category: e.target.value as CategoryCode })}
                      className="w-24 rounded border border-gray-300 px-2 py-1 text-sm disabled:bg-gray-100"
                    >
                      <option value="">선택</option>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {CATEGORY_LABELS[c]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      value={row.unit}
                      disabled={readOnly}
                      onChange={(e) => updateRow(row.key, { unit: e.target.value })}
                      className="w-16 rounded border border-gray-300 px-2 py-1 text-sm disabled:bg-gray-100"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      value={row.quantity}
                      disabled={readOnly}
                      onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                      className="w-20 rounded border border-gray-300 px-2 py-1 text-sm disabled:bg-gray-100"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      value={row.unitPrice}
                      disabled={readOnly}
                      onChange={(e) => handlePriceChange(row.key, e.target.value)}
                      className={`w-24 rounded border px-2 py-1 text-sm disabled:bg-gray-100 ${
                        row.priceOverridden ? "border-red-400 bg-red-50" : "border-gray-300"
                      }`}
                    />
                    {row.priceOverridden && <p className="mt-1 text-xs text-red-600">계약단가와 다름</p>}
                  </td>
                  <td className="px-2 py-2 text-gray-700">{amount.toLocaleString()}</td>
                  <td className="px-2 py-2">
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => removeRow(row.key)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        삭제
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!readOnly && (
        <button
          type="button"
          onClick={addRow}
          className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          + 품목 추가
        </button>
      )}

      <p className="text-sm font-medium text-gray-900">합계금액: {total.toLocaleString()}원</p>

      {message && (
        <p className={`text-sm ${message.type === "error" ? "text-red-600" : "text-green-600"}`}>{message.text}</p>
      )}

      {!readOnly && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={pending}
            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            임시저장
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={pending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            확정
          </button>
        </div>
      )}
    </div>
  );
}
