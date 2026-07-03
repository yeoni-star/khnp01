"use client";

import { useState, useTransition, useRef, useMemo } from "react";
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

type UnmatchedItemOption = {
  itemName: string;
  unit: string;
  unitPrice: number;
};

export default function SlipItemsTable({
  slipId,
  status,
  taxType,
  contractItems,
  unmatchedItems = [],
  initialItems,
}: {
  slipId: string;
  status: "DRAFT" | "CONFIRMED";
  taxType: TaxTypeCode;
  contractItems: ContractItemOption[];
  unmatchedItems?: UnmatchedItemOption[];
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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [importPending, setImportPending] = useState(false);
  const [importNote, setImportNote] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [activeRowKey, setActiveRowKey] = useState<string | null>(null);
  const [itemTypeFilter, setItemTypeFilter] = useState<"ALL" | "CONTRACT" | "UNREGISTERED">("ALL");

  const searchPool = useMemo(() => {
    const contractOptions = contractItems.map((item) => ({
      key: `contract-${item.id}`,
      name: item.itemName,
      unit: item.unit,
      price: item.unitPrice,
      category: item.category,
      contractItemId: item.id,
      source: "계약단가" as const,
    }));

    const unmatchedOptions = unmatchedItems.map((item, idx) => ({
      key: `unmatched-${idx}`,
      name: item.itemName,
      unit: item.unit,
      price: item.unitPrice,
      category: undefined,
      contractItemId: null,
      source: "미등록" as const,
    }));

    return [...contractOptions, ...unmatchedOptions];
  }, [contractItems, unmatchedItems]);

  const readOnly = status === "CONFIRMED";

  function handleSelectSearchItem(selected: {
    name: string;
    unit: string;
    price: number;
    category?: CategoryCode;
    contractItemId: string | null;
    source: "계약단가" | "미등록";
  }) {
    if (readOnly) return;
    let targetKey = activeRowKey;
    let targetRow = rows.find((r) => r.key === targetKey);

    if (!targetKey || !targetRow || targetRow.itemName.trim() !== "") {
      const newRowObj = emptyRow();
      setRows((prev) => [...prev, newRowObj]);
      targetKey = newRowObj.key;
      targetRow = newRowObj;
    }

    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== targetKey) return r;

        const quantityNum = Number(r.quantity) || 1;
        const amount = quantityNum * selected.price;
        const expectedTax = taxType === "TAXABLE" ? computeTaxAmount(amount) : 0;

        return {
          ...r,
          itemName: selected.name,
          category: selected.category ?? "",
          unit: selected.unit,
          quantity: String(quantityNum),
          unitPrice: String(selected.price),
          taxAmount: taxType === "TAXABLE" ? String(expectedTax) : "",
          matchedContractItemId: selected.contractItemId,
          matchType: selected.source === "계약단가" ? ("EXACT" as const) : ("NONE" as const),
          priceOverridden: false,
          suggestion: null,
        };
      })
    );

    setActiveRowKey(targetKey);
  }

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  async function handleExcelUpload(file: File) {
    setSelectedFileName(file.name);
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

  function handleConfirmClick() {
    setShowConfirmDialog(true);
  }

  function handleConfirmSubmit() {
    setShowConfirmDialog(false);
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

  const filteredSearchItems = useMemo(() => {
    let pool = searchPool;
    if (itemTypeFilter === "CONTRACT") {
      pool = searchPool.filter((item) => item.source === "계약단가");
    } else if (itemTypeFilter === "UNREGISTERED") {
      pool = searchPool.filter((item) => item.source === "미등록");
    }

    if (!searchQuery.trim()) {
      return pool.slice(0, 30);
    }
    const q = searchQuery.toLowerCase();
    return pool.filter((item) => item.name.toLowerCase().includes(q)).slice(0, 30);
  }, [searchPool, searchQuery, itemTypeFilter]);

  return (
    <div className="grid grid-cols-4 gap-4">
      {/* 왼쪽 메인 입력 폼 영역 */}
      <div className="col-span-3 space-y-4">
        {!readOnly && (
          <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between border-b pb-2 mb-3">
              <span className="text-xs font-bold text-gray-700">엑셀 업로드 (.xlsx)</span>
              <div className="flex gap-3 text-xs">
                <a href="/api/templates/slip-excel?taxType=TAXABLE" className="text-primary-600 hover:underline">
                  과세 양식 다운로드
                </a>
                <span className="text-gray-300">|</span>
                <a href="/api/templates/slip-excel?taxType=EXEMPT" className="text-primary-600 hover:underline">
                  면세 양식 다운로드
                </a>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx"
                disabled={importPending}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    void handleExcelUpload(file);
                  }
                  e.target.value = "";
                }}
                className="hidden"
              />
              <button
                type="button"
                disabled={importPending}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded bg-primary-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50 transition cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                엑셀 파일 선택
              </button>
              <span className="text-xs text-gray-500">
                {importPending
                  ? "불러오는 중..."
                  : selectedFileName
                  ? `선택됨: ${selectedFileName}`
                  : "선택된 파일 없음"}
              </span>
            </div>
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
                        onFocus={() => setActiveRowKey(row.key)}
                        className={`w-40 rounded border px-2 py-1 text-sm disabled:bg-gray-100 ${
                          activeRowKey === row.key ? "border-primary-500 ring-1 ring-primary-500" : "border-gray-300"
                        }`}
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
              className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              + 1줄 추가
            </button>
            <button
              type="button"
              onClick={() => addRows(5)}
              className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              + 5줄 추가
            </button>
            <button
              type="button"
              onClick={() => addRows(10)}
              className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
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
              className="ml-auto rounded border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 cursor-pointer"
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
              className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
            >
              임시저장
            </button>
            <button
              type="button"
              onClick={handleConfirmClick}
              disabled={pending || hasMismatch}
              className="rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 cursor-pointer"
            >
              확정
            </button>
          </div>
        )}

        {showConfirmDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-80 rounded-lg bg-white p-5 shadow-xl">
              <p className="text-sm font-medium text-gray-900">아래 금액으로 확정하시겠습니까?</p>
              <div className="mt-3 space-y-1 rounded border border-gray-200 bg-gray-50 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">공급가액</span>
                  <span className="font-medium text-gray-900">{total.toLocaleString()}원</span>
                </div>
                {taxType === "TAXABLE" && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">세액</span>
                    <span className="font-medium text-gray-900">{totalTax.toLocaleString()}원</span>
                  </div>
                )}
                <div className="mt-1 flex justify-between border-t border-gray-200 pt-1">
                  <span className="text-gray-600">총액</span>
                  <span className="font-semibold text-gray-900">{(total + totalTax).toLocaleString()}원</span>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmDialog(false)}
                  className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  아니오
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  className="rounded bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 cursor-pointer"
                >
                  예
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 오른쪽 검색 도우미 패널 영역 */}
      <div className="col-span-1">
        <div className="sticky top-6 rounded-md border border-gray-200 bg-white p-4 shadow-sm h-[calc(100vh-8rem)] max-h-[600px] flex flex-col">
          <div className="border-b pb-2 mb-3">
            <h3 className="text-sm font-bold text-gray-800">🔍 품목 검색 도우미</h3>
            <p className="text-[11px] text-gray-500 mt-1">
              {readOnly
                ? "확정된 명세표는 수정 불가합니다. (단가 및 규격 조회용)"
                : "입력하려는 품명 칸을 먼저 마우스로 클릭(포커싱)한 뒤, 아래 검색 결과에서 품목을 클릭하면 자동 입력됩니다."}
            </p>
          </div>

          {/* 구분 필터 탭 */}
          <div className="mb-2 flex gap-1 rounded bg-gray-100 p-0.5 text-[11px] font-semibold text-gray-500">
            <button
              type="button"
              onClick={() => setItemTypeFilter("ALL")}
              className={`flex-1 rounded py-1 text-center transition cursor-pointer ${
                itemTypeFilter === "ALL" ? "bg-white text-gray-900 shadow-xs" : "hover:text-gray-900"
              }`}
            >
              전체 ({searchPool.length})
            </button>
            <button
              type="button"
              onClick={() => setItemTypeFilter("CONTRACT")}
              className={`flex-1 rounded py-1 text-center transition cursor-pointer ${
                itemTypeFilter === "CONTRACT" ? "bg-white text-gray-900 shadow-xs" : "hover:text-gray-900"
              }`}
            >
              계약품목 ({searchPool.filter(i => i.source === "계약단가").length})
            </button>
            <button
              type="button"
              onClick={() => setItemTypeFilter("UNREGISTERED")}
              className={`flex-1 rounded py-1 text-center transition cursor-pointer ${
                itemTypeFilter === "UNREGISTERED" ? "bg-white text-gray-900 shadow-xs" : "hover:text-gray-900"
              }`}
            >
              미등록 ({searchPool.filter(i => i.source === "미등록").length})
            </button>
          </div>

          <div className="mb-3">
            <input
              type="text"
              placeholder="품명 키워드 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-xs focus:border-primary-500 focus:outline-none"
            />
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 pr-1">
            {filteredSearchItems.map((item) => (
              <button
                key={item.key}
                type="button"
                disabled={readOnly}
                onClick={() => handleSelectSearchItem(item)}
                className={`w-full text-left py-2 px-1 transition rounded flex flex-col gap-0.5 ${
                  readOnly
                    ? "cursor-not-allowed opacity-75"
                    : "hover:bg-gray-50 cursor-pointer"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      item.source === "계약단가" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {item.source}
                  </span>
                  <span className="text-xs font-bold text-gray-800 line-clamp-1">{item.name}</span>
                </div>
                <div className="text-[10px] text-gray-500 flex justify-between">
                  <span>규격: {item.unit || "-"}</span>
                  <span className="font-semibold text-gray-700">₩{item.price.toLocaleString()}</span>
                </div>
              </button>
            ))}
            {filteredSearchItems.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-8">검색 결과가 존재하지 않습니다.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
