"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createContract, updateContract } from "@/actions/contract-actions";
import { CATEGORIES, CATEGORY_LABELS, type CategoryCode } from "@/lib/categories";

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

  function updateItem(index: number, patch: Partial<ContractItemRow>) {
    setItems((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setItems((prev) => [...prev, emptyRow()]);
  }

  function removeRow(index: number) {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  const itemsJson = JSON.stringify(
    items
      .filter((row) => row.itemName.trim())
      .map((row) => ({ ...row, unitPrice: Number(row.unitPrice) || 0 }))
  );

  return (
    <form ref={formRef} action={formAction} className="space-y-6">
      <input type="hidden" name="itemsJson" value={itemsJson} />

      <p className="text-xs text-gray-500">계약과 단가표는 식당 A/B 공통으로 적용됩니다.</p>

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
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">단가표</h2>
          <button
            type="button"
            onClick={addRow}
            className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            + 품목 추가
          </button>
        </div>
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
            {items.map((row, index) => (
              <tr key={index}>
                <td className="px-2 py-1">
                  <input
                    value={row.itemName}
                    onChange={(e) => updateItem(index, { itemName: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    value={row.unit}
                    onChange={(e) => updateItem(index, { unit: e.target.value })}
                    className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    type="number"
                    value={row.unitPrice}
                    onChange={(e) => updateItem(index, { unitPrice: e.target.value })}
                    className="w-28 rounded border border-gray-300 px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-2 py-1">
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
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

      {state && !state.ok && <p className="text-sm text-red-600">{state.message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? "저장 중..." : isEdit ? "계약 수정" : "계약 등록"}
      </button>
    </form>
  );
}
