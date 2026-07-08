"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, CATEGORY_LABELS, type CategoryCode } from "@/lib/categories";

type ContractItemOption = {
  id: string;
  itemName: string;
  category: CategoryCode;
  unit: string;
  unitPrice: number;
  vendorName: string;
};

export default function ContractItemSearchPanel({ items }: { items: ContractItemOption[] }) {
  const [isOpen, setIsOpen] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<CategoryCode | "ALL">("ALL");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    let pool = items;
    if (categoryFilter !== "ALL") {
      pool = pool.filter((i) => i.category === categoryFilter);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      pool = pool.filter((i) => i.itemName.toLowerCase().includes(q));
    }
    return pool.slice(0, 50);
  }, [items, categoryFilter, query]);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="h-fit rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
      >
        🔍 품목 검색 열기
      </button>
    );
  }

  return (
    <div className="sticky top-6 h-fit rounded-md border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between border-b pb-2">
        <h3 className="text-sm font-bold text-gray-800">🔍 계약품목 검색</h3>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          닫기 ✕
        </button>
      </div>

      <div className="mb-2 flex flex-wrap gap-1 text-[11px] font-semibold text-gray-500">
        <button
          type="button"
          onClick={() => setCategoryFilter("ALL")}
          className={`rounded px-2 py-1 transition cursor-pointer ${
            categoryFilter === "ALL" ? "bg-primary-600 text-white" : "bg-gray-100 hover:bg-gray-200"
          }`}
        >
          전체
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategoryFilter(c)}
            className={`rounded px-2 py-1 transition cursor-pointer ${
              categoryFilter === c ? "bg-primary-600 text-white" : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      <input
        type="text"
        placeholder="품명 키워드 검색..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-xs focus:border-primary-500 focus:outline-none"
      />

      <div className="max-h-[500px] divide-y divide-gray-100 overflow-y-auto pr-1">
        {filtered.map((item) => (
          <div key={item.id} className="px-1 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="line-clamp-1 text-xs font-bold text-gray-800">{item.itemName}</span>
              <span className="shrink-0 text-xs font-semibold text-gray-700">
                ₩{item.unitPrice.toLocaleString()}
              </span>
            </div>
            <div className="mt-0.5 flex justify-between text-[10px] text-gray-500">
              <span>
                {item.vendorName} · {item.unit}
              </span>
              <span>{CATEGORY_LABELS[item.category]}</span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="py-8 text-center text-xs text-gray-400">검색 결과가 없습니다.</p>}
      </div>
    </div>
  );
}
