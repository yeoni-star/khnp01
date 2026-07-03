"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMealCompany, deleteMealCompany, updateMealCompany } from "@/actions/meal-actions";

type Company = { id: string; name: string; pricePerMeal: number; memo: string | null };

function CompanyRow({ company }: { company: Company }) {
  const router = useRouter();
  const [name, setName] = useState(company.name);
  const [price, setPrice] = useState(String(company.pricePerMeal));
  const [memo, setMemo] = useState(company.memo ?? "");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await updateMealCompany(company.id, {
        name,
        pricePerMeal: Number(price) || 0,
        memo,
      });
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm(`'${company.name}' 업체를 삭제할까요?`)) return;
    setMessage(null);
    startTransition(async () => {
      const result = await deleteMealCompany(company.id);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <tr>
      <td className="px-3 py-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-32 rounded border border-gray-300 px-2 py-1 text-sm"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
        />
      </td>
      <td className="px-3 py-2">
        <input
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="메모"
          className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
        />
      </td>
      <td className="px-3 py-2 text-right">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            저장
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="rounded border border-red-300 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            삭제
          </button>
        </div>
        {message && <p className="mt-1 text-right text-xs text-red-600">{message}</p>}
      </td>
    </tr>
  );
}

export default function MealCompanyManager({ initialCompanies }: { initialCompanies: Company[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAdd() {
    setError(null);
    startTransition(async () => {
      const result = await createMealCompany({ name, pricePerMeal: Number(price) || 0, memo });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setName("");
      setPrice("");
      setMemo("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3 rounded-md border border-gray-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">업체명</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-40 rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">1식 단가(원)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-28 rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-600">메모</label>
          <input
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={pending || !name || !price}
          className="rounded bg-primary-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          추가
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500">
            <tr>
              <th className="px-3 py-2">업체명</th>
              <th className="px-3 py-2">1식 단가(원)</th>
              <th className="px-3 py-2">메모</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {initialCompanies.map((c) => (
              <CompanyRow key={c.id} company={c} />
            ))}
            {initialCompanies.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-gray-400">
                  등록된 업체가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
