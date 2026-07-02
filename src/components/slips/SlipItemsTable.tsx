"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { saveSlipDraft, confirmSlip } from "@/actions/slip-actions";
import { CATEGORIES, CATEGORY_LABELS, type CategoryCode } from "@/lib/categories";
import { findSimilarItem } from "@/lib/item-matching";
import { createWorker } from "tesseract.js";
import { parseLine, guessDeliveryDate, guessVendorName } from "@/lib/ocr/parser";
import type { OcrItem } from "@/lib/ocr/schema";

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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isImageFixed, setIsImageFixed] = useState(false);
  const readOnly = status === "CONFIRMED";

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  async function handleFileUpload(file: File) {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setOcrPending(true);
    setOcrNote(null);
    setMessage(null);
    
    try {
      // 1. 서버에 이미지 파일 저장 요청 (Background 처리)
      const formData = new FormData();
      formData.append("file", file);
      fetch(`/api/slips/${slipId}/upload`, { method: "POST", body: formData }).catch(console.error);

      // 2. 클라이언트 브라우저에서 Tesseract.js 실행
      const worker = await createWorker("kor+eng");
      const { data } = await worker.recognize(file, {}, { text: true, blocks: true });
      
      const lines: string[] = [];
      for (const block of data.blocks ?? []) {
        for (const paragraph of block.paragraphs) {
          for (const line of paragraph.lines) {
            lines.push(line.text);
          }
        }
      }

      const items = lines.map(parseLine).filter((item): item is OcrItem => item !== null);

      if (items.length > 0) {
        setRows(
          items.map((item) =>
            matchRow(item.itemName, item.quantity ?? 0, item.unit ?? "", item.unitPrice ?? 0, contractItems)
          )
        );
      }

      const vName = guessVendorName(data.text);
      const dDate = guessDeliveryDate(data.text);
      
      const noteParts: string[] = [];
      if (vName) noteParts.push(`업체 추정: ${vName}`);
      if (dDate) noteParts.push(`날짜 추정: ${dDate}`);
      if (items.length === 0) noteParts.push("품목을 자동으로 인식하지 못했습니다. 직접 입력해 주세요.");
      
      setOcrNote(noteParts.length > 0 ? noteParts.join(" · ") : null);
      setMessage({ type: "success", text: `${items.length}개 품목을 인식했습니다. 검수 후 저장해 주세요.` });

      await worker.terminate();
    } catch (error) {
      console.error("OCR Error", error);
      setMessage({ type: "error", text: "업로드/인식 중 오류가 발생했습니다. 직접 입력해 주세요." });
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

  function addRows(count: number) {
    setRows((prev) => [...prev, ...Array.from({ length: count }, () => emptyRow())]);
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
      <div className={previewUrl ? "grid gap-4 md:grid-cols-[320px_1fr]" : ""}>
        {previewUrl && (
          <div
            className={
              isImageFixed
                ? "fixed top-4 left-4 z-50 w-[450px] rounded-lg border border-gray-300 bg-white p-3 shadow-2xl transition-all"
                : "md:sticky md:top-4 md:self-start"
            }
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-gray-600">업로드한 원본 이미지</p>
              <button
                type="button"
                onClick={() => setIsImageFixed(!isImageFixed)}
                className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
              >
                {isImageFixed ? "고정 해제" : "화면 고정"}
              </button>
            </div>
            <div className="overflow-hidden rounded-md border border-gray-200 bg-gray-50">
              <TransformWrapper>
                <TransformComponent>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="업로드한 거래명세표 원본"
                    className="w-full object-contain"
                    style={isImageFixed ? { maxHeight: "80vh" } : undefined}
                  />
                </TransformComponent>
              </TransformWrapper>
            </div>
            <p className="mt-2 text-center text-[10px] text-gray-400">마우스 휠로 확대/축소, 드래그로 이동</p>
          </div>
        )}
        <div className="space-y-4">
      {!readOnly && (
        <div className="rounded-md border border-gray-200 bg-white p-4">
          <label className="mb-1 block text-xs font-medium text-gray-600">영수증 업로드 (JPG/PNG)</label>
          <input
            type="file"
            accept="image/jpeg,image/png"
            disabled={ocrPending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFileUpload(file);
              e.target.value = "";
            }}
            className="block text-sm"
          />
          {ocrPending && <p className="mt-1 text-xs text-gray-500">인식 중입니다...</p>}
          {ocrNote && <p className="mt-1 text-xs text-gray-500">{ocrNote}</p>}
        </div>
      )}

      <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500">
            <tr>
              <th className="px-2 py-2">품명</th>
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
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => addRows(1)}
            className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            + 1줄 추가
          </button>
          <button
            type="button"
            onClick={() => addRows(5)}
            className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            + 5줄 추가
          </button>
          <button
            type="button"
            onClick={() => addRows(10)}
            className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            + 10줄 추가
          </button>
        </div>
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
      </div>
    </div>
  );
}
