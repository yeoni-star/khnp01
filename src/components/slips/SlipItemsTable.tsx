"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSlipDraft, confirmSlip } from "@/actions/slip-actions";
import type { CategoryCode } from "@/lib/categories";
import { findSimilarItem } from "@/lib/item-matching";
import { computeTaxAmount, type TaxTypeCode } from "@/lib/tax";

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
  taxAmount: string;
  matchedContractItemId: string | null;
  matchType: MatchType;
  priceOverridden: boolean;
  suggestion: { item: ContractItemOption; score: number } | null;
};

type ImportedItem = {
  itemName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxAmount: number | null;
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
    taxAmount: "",
    matchedContractItemId: null,
    matchType: "NONE",
    priceOverridden: false,
    suggestion: null,
  };
}

function normalize(s: string) {
  return s.trim().toLowerCase();
}

function matchImportedRow(
  item: ImportedItem,
  taxType: TaxTypeCode,
  contractItems: ContractItemOption[]
): Row {
  const normalized = normalize(item.itemName);
  const exact = contractItems.find((c) => normalize(c.itemName) === normalized);

  if (exact) {
    const amount = item.quantity * exact.unitPrice;
    return {
      key: newRowKey(),
      itemName: item.itemName,
      category: exact.category,
      unit: exact.unit,
      quantity: String(item.quantity),
      unitPrice: String(exact.unitPrice),
      taxAmount: taxType === "TAXABLE" ? String(item.taxAmount ?? computeTaxAmount(amount)) : "",
      matchedContractItemId: exact.id,
      matchType: "EXACT",
      priceOverridden: false,
      suggestion: null,
    };
  }

  const similar = findSimilarItem(item.itemName, contractItems);
  const amount = item.quantity * item.unitPrice;
  return {
    key: newRowKey(),
    itemName: item.itemName,
    category: "",
    unit: item.unit,
    quantity: String(item.quantity),
    unitPrice: String(item.unitPrice || 0),
    taxAmount: taxType === "TAXABLE" ? String(item.taxAmount ?? computeTaxAmount(amount)) : "",
    matchedContractItemId: null,
    matchType: "NONE",
    priceOverridden: false,
    suggestion: similar,
  };
}

export default function SlipItemsTable({
  slipId,
  status,
  taxType,
  contractItems,
  initialItems,
}: {
  slipId: string;
  status: "DRAFT" | "CONFIRMED";
  taxType: TaxTypeCode;
  contractItems: ContractItemOption[];
  initialItems: {
    itemName: string;
    category: CategoryCode | null;
    unit: string;
    quantity: number;
    unitPrice: number;
    taxAmount: number | null;
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
          taxAmount: i.taxAmount !== null ? String(i.taxAmount) : "",
          matchedContractItemId: i.matchedContractItemId,
          matchType: i.matchType,
          priceOverridden: i.priceOverridden,
          suggestion: null,
        }))
      : [emptyRow()]
  );
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [importPending, setImportPending] = useState(false);
  const [importNote, setImportNote] = useState<string | null>(null);
  const readOnly = status === "CONFIRMED";

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  async function handleExcelUpload(file: File) {
    setImportPending(true);
    setImportNote(null);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/slips/${slipId}/import-excel`, { method: "POST", body: formData });
      const data = await res.json();

      if (!data.ok) {
        setMessage({ type: "error", text: data.message ?? "엑셀 업로드에 실패했습니다." });
        return;
      }

      const items: ImportedItem[] = data.items;
      setRows(items.map((item) => matchImportedRow(item, taxType, contractItems)));
      setMessage({ type: "success", text: `${items.length}개 품목을 불러왔습니다. 검수 후 저장해 주세요.` });
    } catch (error) {
      console.error("Excel import error", error);
      setMessage({ type: "error", text: "엑셀 업로드 중 오류가 발생했습니다. 직접 입력해 주세요." });
    } finally {
      setImportPending(false);
    }
  }

  function handleItemNameBlur(key: string, value: string) {
    const normalized = normalize(value);
    if (!normalized) return;

    const exact = contractItems.find((c) => normalize(c.itemName) === normalized);
    if (exact) {
      setRows((prev) =>
        prev.map((r) => {
          if (r.key !== key) return r;
          const amount = (Number(r.quantity) || 0) * exact.unitPrice;
          return {
            ...r,
            category: exact.category,
            unit: exact.unit,
            unitPrice: String(exact.unitPrice),
            taxAmount: taxType === "TAXABLE" ? String(computeTaxAmount(amount)) : r.taxAmount,
            matchedContractItemId: exact.id,
            matchType: "EXACT" as const,
            priceOverridden: false,
            suggestion: null,
          };
        })
      );
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
        const amount = (Number(r.quantity) || 0) * item.unitPrice;
        return {
          ...r,
          category: item.category,
          unit: item.unit,
          unitPrice: String(item.unitPrice),
          taxAmount: taxType === "TAXABLE" ? String(computeTaxAmount(amount)) : r.taxAmount,
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

  function handleQuantityChange(key: string, value: string) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r;
        if (taxType !== "TAXABLE") return { ...r, quantity: value };
        const amount = (Number(value) || 0) * (Number(r.unitPrice) || 0);
        return { ...r, quantity: value, taxAmount: String(computeTaxAmount(amount)) };
      })
    );
  }

  function handlePriceChange(key: string, value: string) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r;
        const matched = contractItems.find((c) => c.id === r.matchedContractItemId);
        const overridden = matched ? String(matched.unitPrice) !== value : r.priceOverridden;
        if (taxType !== "TAXABLE") return { ...r, unitPrice: value, priceOverridden: overridden };
        const amount = (Number(r.quantity) || 0) * (Number(value) || 0);
        return { ...r, unitPrice: value, priceOverridden: overridden, taxAmount: String(computeTaxAmount(amount)) };
      })
    );
  }

  function handleTaxAmountChange(key: string, value: string) {
    updateRow(key, { taxAmount: value });
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
        .map((r) => {
          const matched = contractItems.find((c) => c.id === r.matchedContractItemId);
          const isPriceDiff = matched ? String(matched.unitPrice) !== r.unitPrice : false;
          return {
            itemName: r.itemName.trim(),
            category: r.category || null,
            unit: r.unit.trim(),
            quantity: Number(r.quantity) || 0,
            unitPrice: Number(r.unitPrice) || 0,
            taxAmount: taxType === "TAXABLE" ? Number(r.taxAmount) || 0 : null,
            matchedContractItemId: r.matchedContractItemId,
            matchType: r.matchType,
            priceOverridden: isPriceDiff,
          };
        })
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
  const totalTax =
    taxType === "TAXABLE" ? rows.reduce((sum, r) => sum + (Number(r.taxAmount) || 0), 0) : 0;

  const hasMismatch = rows.some((row) => {
    const contractItem = contractItems.find((c) => c.id === row.matchedContractItemId);
    if (!contractItem) return false;
    const isPriceDiff = String(contractItem.unitPrice) !== row.unitPrice;
    const isUnitDiff = normalize(contractItem.unit) !== normalize(row.unit);
    return isPriceDiff || isUnitDiff;
  });

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="rounded-md border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium text-gray-600">엑셀 업로드 (.xlsx)</label>
            <div className="flex gap-3 text-xs">
              <a href="/api/templates/slip-excel?taxType=TAXABLE" className="text-primary-600 hover:underline">
                과세 양식 다운로드
              </a>
              <a href="/api/templates/slip-excel?taxType=EXEMPT" className="text-primary-600 hover:underline">
                면세 양식 다운로드
              </a>
            </div>
          </div>
          <input
            type="file"
            accept=".xlsx"
            disabled={importPending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleExcelUpload(file);
              e.target.value = "";
            }}
            className="mt-1 block text-sm"
          />
          {importPending && <p className="mt-1 text-xs text-gray-500">불러오는 중입니다...</p>}
          {importNote && <p className="mt-1 text-xs text-gray-500">{importNote}</p>}
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
              {taxType === "TAXABLE" && <th className="px-2 py-2">세액</th>}
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => {
              const contractItem = contractItems.find((c) => c.id === row.matchedContractItemId);
              const isPriceDiff = contractItem && String(contractItem.unitPrice) !== row.unitPrice;
              const isUnitDiff = contractItem && normalize(contractItem.unit) !== normalize(row.unit);
              const amount = (Number(row.quantity) || 0) * (Number(row.unitPrice) || 0);
              const expectedTax = computeTaxAmount(amount);
              const isTaxDiff = taxType === "TAXABLE" && (Number(row.taxAmount) || 0) !== expectedTax;

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
                      <p className="mt-1 text-xs text-primary-600">계약단가 적용</p>
                    )}
                    {row.matchType === "FUZZY_CONFIRMED" && (
                      <p className="mt-1 text-xs text-primary-600">유사품목 확인 · 계약단가 적용</p>
                    )}
                    {row.matchType === "NONE" && !row.suggestion && row.itemName.trim() && (
                      <p className="mt-1 text-xs text-gray-500">수기 입력</p>
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
                      className={`w-16 rounded border px-2 py-1 text-sm disabled:bg-gray-100 ${
                        isUnitDiff ? "border-red-400 bg-red-50" : "border-gray-300"
                      }`}
                    />
                    {isUnitDiff && <p className="mt-1 text-xs text-red-600">계약과 다름</p>}
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      value={row.quantity}
                      disabled={readOnly}
                      onChange={(e) => handleQuantityChange(row.key, e.target.value)}
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
                        isPriceDiff ? "border-red-400 bg-red-50" : "border-gray-300"
                      }`}
                    />
                    {isPriceDiff && <p className="mt-1 text-xs text-red-600">계약단가와 다름</p>}
                  </td>
                  <td className="px-2 py-2 text-gray-700">{amount.toLocaleString()}</td>
                  {taxType === "TAXABLE" && (
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={row.taxAmount}
                        disabled={readOnly}
                        onChange={(e) => handleTaxAmountChange(row.key, e.target.value)}
                        className={`w-24 rounded border px-2 py-1 text-sm disabled:bg-gray-100 ${
                          isTaxDiff ? "border-red-400 bg-red-50" : "border-gray-300"
                        }`}
                      />
                      {isTaxDiff && <p className="mt-1 text-xs text-red-600">확인필요</p>}
                    </td>
                  )}
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
          <button
            type="button"
            onClick={() => {
              if (confirm("입력한 내용을 모두 초기화하시겠습니까?")) {
                setRows([emptyRow()]);
                setImportNote(null);
                setMessage(null);
              }
            }}
            className="ml-auto rounded border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
          >
            입력 초기화
          </button>
        </div>
      )}

      <p className="text-sm font-medium text-gray-900">
        합계금액(공급가액): {total.toLocaleString()}원
        {taxType === "TAXABLE" && (
          <>
            {" · "}세액 합계: {totalTax.toLocaleString()}원 · 총액: {(total + totalTax).toLocaleString()}원
          </>
        )}
      </p>

      {message && (
        <p className={`text-sm ${message.type === "error" ? "text-red-600" : "text-green-600"}`}>{message.text}</p>
      )}

      {hasMismatch && !readOnly && (
        <p className="text-sm font-medium text-red-600">⚠️ 계약 내용과 다른 항목(빨간색 표시)을 계약과 동일하게 수정해야 저장할 수 있습니다.</p>
      )}

      {!readOnly && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={pending || hasMismatch}
            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            임시저장
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={pending || hasMismatch}
            className="rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            확정
          </button>
        </div>
      )}
    </div>
  );
}
