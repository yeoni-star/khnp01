"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createContract, updateContract } from "@/actions/contract-actions";
import { CATEGORIES, CATEGORY_LABELS, type CategoryCode } from "@/lib/categories";
import { createWorker } from "tesseract.js";
import { parseContractLine } from "@/lib/ocr/parser";

type ContractItemRow = {
  itemName: string;
  unit: string;
  unitPrice: string;
};

type ExistingContract = {
  id: string;
  vendorName: string;
  category: CategoryCode;
  startDate: Date;
  endDate: Date;
  title: string | null;
  memo: string | null;
  items: { itemName: string; unit: string; unitPrice: number }[];
};

type ActionState = { ok: boolean; message?: string } | null;

function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 10);
}

function emptyRow(): ContractItemRow {
  return { itemName: "", unit: "", unitPrice: "" };
}

export default function ContractForm({
  vendorNames,
  contract,
}: {
  vendorNames: string[];
  contract?: ExistingContract;
}) {
  const router = useRouter();
  const isEdit = Boolean(contract);
  const formRef = useRef<HTMLFormElement>(null);

  const [vendorName, setVendorName] = useState(contract?.vendorName ?? "");
  const [category, setCategory] = useState<CategoryCode | "">(contract?.category ?? "");
  const [startDate, setStartDate] = useState(contract ? toDateInputValue(contract.startDate) : "");
  const [endDate, setEndDate] = useState(contract ? toDateInputValue(contract.endDate) : "");
  const [title, setTitle] = useState(contract?.title ?? "");
  const [memo, setMemo] = useState(contract?.memo ?? "");
  const [items, setItems] = useState<ContractItemRow[]>(
    contract && contract.items.length > 0
      ? contract.items.map((i) => ({
          itemName: i.itemName,
          unit: i.unit,
          unitPrice: String(i.unitPrice),
        }))
      : [emptyRow()]
  );

  const [ocrPending, setOcrPending] = useState(false);
  const [ocrMessage, setOcrMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isPinned, setIsPinned] = useState(false);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const [excelPending, setExcelPending] = useState(false);

  const boundAction = isEdit
    ? (formData: FormData) => updateContract(contract!.id, formData)
    : createContract;

  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (_prev, formData) => boundAction(formData),
    null
  );

  useEffect(() => {
    if (state?.ok) {
      router.push("/contracts");
    }
  }, [state, router]);

  // Clean up Object URL
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function updateItem(index: number, patch: Partial<ContractItemRow>) {
    setItems((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setItems((prev) => [...prev, emptyRow()]);
  }

  function removeRow(index: number) {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  async function handleFileUpload(file: File) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setZoom(1);

    setOcrPending(true);
    setOcrMessage(null);
    try {
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

      const parsedItems = lines.map(parseContractLine).filter((item): item is NonNullable<ReturnType<typeof parseContractLine>> => item !== null);

      if (parsedItems.length > 0) {
        setItems(parsedItems.map(item => ({
          itemName: item.itemName,
          unit: item.unit,
          unitPrice: String(item.unitPrice)
        })));
        setOcrMessage({ type: "success", text: `${parsedItems.length}개 품목을 인식했습니다. 검수해 주세요.` });
      } else {
        setOcrMessage({ type: "error", text: "단가표를 인식하지 못했습니다. 직접 입력해 주세요." });
      }

      await worker.terminate();
    } catch (error) {
      console.error("OCR Error", error);
      setOcrMessage({ type: "error", text: "이미지 인식 중 오류가 발생했습니다." });
    } finally {
      setOcrPending(false);
    }
  }

  async function handleExcelUpload(file: File) {
    setExcelPending(true);
    setOcrMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/contracts/import-excel", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setOcrMessage({ type: "error", text: data.message || "엑셀 업로드에 실패했습니다." });
        return;
      }

      if (data.items && data.items.length > 0) {
        setItems(
          data.items.map((item: any) => ({
            itemName: item.itemName,
            unit: item.unit,
            unitPrice: String(item.unitPrice),
          }))
        );
        setOcrMessage({ type: "success", text: `엑셀에서 ${data.items.length}개 품목 단가를 가져왔습니다.` });
      }
    } catch (error) {
      console.error("Excel import error", error);
      setOcrMessage({ type: "error", text: "엑셀 파싱 중 네트워크 오류가 발생했습니다." });
    } finally {
      setExcelPending(false);
    }
  }

  const itemsJson = JSON.stringify(
    items
      .filter((row) => row.itemName.trim())
      .map((row) => ({ ...row, unitPrice: Number(row.unitPrice) || 0 }))
  );

  const duplicateNames = new Set<string>();
  const seenNames = new Set<string>();
  for (const row of items) {
    const name = row.itemName.trim();
    if (name) {
      if (seenNames.has(name)) {
        duplicateNames.add(name);
      } else {
        seenNames.add(name);
      }
    }
  }
  const hasDuplicates = duplicateNames.size > 0;

  return (
    <div className={`flex gap-6 items-start ${previewUrl ? 'flex-col lg:flex-row' : 'flex-col'}`}>
      {previewUrl && (
        <div className={`rounded-md border border-gray-200 bg-white p-3 ${isPinned ? 'w-full lg:w-1/2 lg:sticky lg:top-4 h-[50vh] lg:h-[calc(100vh-2rem)] flex flex-col' : 'w-full lg:w-1/2'}`}>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-gray-700">단가표 원본</h3>
            <div className="ml-auto flex gap-1">
              <button type="button" onClick={() => setZoom((z) => z + 0.2)} className="rounded border bg-gray-50 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100">
                확대
              </button>
              <button type="button" onClick={() => setZoom((z) => Math.max(0.2, z - 0.2))} className="rounded border bg-gray-50 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100">
                축소
              </button>
              <button type="button" onClick={() => setIsPinned(!isPinned)} className={`rounded border px-2 py-1 text-xs ${isPinned ? 'bg-primary-50 text-primary-700 border-primary-200' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}>
                {isPinned ? '고정 해제' : '화면 고정'}
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto rounded border bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }} className="max-w-none transition-transform" alt="단가표 미리보기" />
          </div>
        </div>
      )}

      <form ref={formRef} action={formAction} className={`space-y-6 ${previewUrl ? 'w-full lg:w-1/2' : 'w-full'}`}>
        <input type="hidden" name="itemsJson" value={itemsJson} />

      <p className="text-xs text-gray-500">계약과 단가표는 본관/후문 공통으로 적용됩니다.</p>

      <div className="grid grid-cols-2 gap-4 rounded-md border border-gray-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">업체명 *</label>
          <input
            name="vendorName"
            list="vendor-name-options"
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            placeholder="업체명을 입력해 주세요"
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
          <datalist id="vendor-name-options">
            {vendorNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">카테고리 *</label>
          <select
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as CategoryCode)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="">카테고리 선택</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">계약 시작일 *</label>
          <input
            type="date"
            name="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">계약 종료일 *</label>
          <input
            type="date"
            name="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">계약명</label>
          <input
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">메모</label>
          <input
            name="memo"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      <div className="rounded-md border border-gray-200 bg-white p-4">
        <div className="mb-4 flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900">단가표</h2>
            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-gray-500">
              <span>양식 다운로드:</span>
              <a
                href="/api/templates/contract-excel?taxType=TAXABLE"
                className="text-primary-600 hover:underline font-semibold"
              >
                📄 과세 양식
              </a>
              <span className="text-gray-300">|</span>
              <a
                href="/api/templates/contract-excel?taxType=EXEMPT"
                className="text-primary-600 hover:underline font-semibold"
              >
                📄 면세 양식
              </a>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* 엑셀 업로드 버튼 */}
            <label className="cursor-pointer rounded bg-primary-50 border border-primary-200 px-3 py-1.5 text-xs font-bold text-primary-700 hover:bg-primary-100 transition">
              {excelPending ? "가져오는 중..." : "📁 엑셀 업로드"}
              <input
                ref={excelInputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                disabled={excelPending}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleExcelUpload(file);
                  e.target.value = "";
                }}
              />
            </label>

            {/* 이미지로 채우기 버튼 */}
            <label className="cursor-pointer rounded border border-gray-300 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 transition">
              {ocrPending ? "인식 중..." : "📷 이미지로 채우기"}
              <input
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                disabled={ocrPending}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFileUpload(file);
                  e.target.value = "";
                }}
              />
            </label>

            {/* 품목 수동 추가 */}
            <button
              type="button"
              onClick={addRow}
              className="rounded border border-gray-300 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 transition"
            >
              + 품목 추가
            </button>
          </div>
        </div>
        {ocrMessage && (
          <p className={`mb-3 text-xs ${ocrMessage.type === "error" ? "text-red-600" : "text-primary-600"}`}>
            {ocrMessage.text}
          </p>
        )}
        {hasDuplicates && (
          <p className="mb-3 text-xs font-bold text-red-600">
            ⚠️ 중복된 품명이 있습니다. 빨간색 테두리로 표시된 항목을 확인해 주세요.
          </p>
        )}
        <table className="w-full text-sm">
          <thead className="text-left text-xs font-medium text-gray-500">
            <tr>
              <th className="px-2 py-1">품명</th>
              <th className="px-2 py-1">단위</th>
              <th className="px-2 py-1">단가</th>
              <th className="px-2 py-1" />
            </tr>
          </thead>
          <tbody>
            {items.map((row, index) => {
              const name = row.itemName.trim();
              const isDuplicate = name !== "" && duplicateNames.has(name);
              return (
                <tr key={index} className="align-top">
                  <td className="px-2 py-1">
                    <input
                      value={row.itemName}
                      onChange={(e) => updateItem(index, { itemName: e.target.value })}
                      className={`w-full rounded border px-2 py-1 text-sm ${
                        isDuplicate ? "border-red-400 bg-red-50" : "border-gray-300"
                      }`}
                    />
                    {isDuplicate && <p className="mt-1 text-xs font-bold text-red-600">중복 품목</p>}
                  </td>
                  <td className="px-2 py-1">
                    <input
                      value={row.unit}
                      onChange={(e) => updateItem(index, { unit: e.target.value })}
                      className={`w-20 rounded border px-2 py-1 text-sm ${
                        isDuplicate ? "border-red-400 bg-red-50" : "border-gray-300"
                      }`}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      value={row.unitPrice}
                      onChange={(e) => updateItem(index, { unitPrice: e.target.value })}
                      className={`w-28 rounded border px-2 py-1 text-sm ${
                        isDuplicate ? "border-red-400 bg-red-50" : "border-gray-300"
                      }`}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      className="text-xs text-red-500 hover:underline mt-1"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {state && !state.ok && <p className="text-sm text-red-600">{state.message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
      >
        {pending ? "저장 중..." : isEdit ? "계약 수정" : "계약 등록"}
      </button>
    </form>
    </div>
  );
}
