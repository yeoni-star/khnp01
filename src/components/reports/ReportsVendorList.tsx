"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/categories";

type VendorItem = {
  id: string;
  name: string;
  category: string;
};

export default function ReportsVendorList({
  vendors,
  startStr,
  endStr,
  categoriesParam,
}: {
  vendors: VendorItem[];
  startStr: string;
  endStr: string;
  categoriesParam?: string;
}) {
  const periodQs = `start=${startStr}&end=${endStr}${categoriesParam ? `&categories=${encodeURIComponent(categoriesParam)}` : ""}`;
  // 전체 체크 여부 초기값: 모두 체크
  const allIds = useMemo(() => vendors.map((v) => v.id), [vendors]);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set(allIds));

  const toggle = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (checkedIds.size === allIds.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(allIds));
    }
  };

  // 선택된 vendorIds를 쿼리스트링으로 변환
  const summaryHref = useMemo(() => {
    const selected = [...checkedIds];
    if (selected.length === 0) {
      return `/reports/summary?${periodQs}`;
    }
    const vendorQs = selected.map((id) => `vendorIds=${encodeURIComponent(id)}`).join("&");
    return `/reports/summary?${periodQs}&${vendorQs}`;
  }, [checkedIds, periodQs]);

  // 카테고리별 그룹
  const grouped = useMemo(() => {
    const map = new Map<string, VendorItem[]>();
    for (const v of vendors) {
      const arr = map.get(v.category) ?? [];
      arr.push(v);
      map.set(v.category, arr);
    }
    return map;
  }, [vendors]);

  const allChecked = checkedIds.size === allIds.length;
  const someChecked = checkedIds.size > 0 && checkedIds.size < allIds.length;

  const renderCategoryBlock = (categoryKey: string, label: string) => {
    const list = grouped.get(categoryKey);
    if (!list || list.length === 0) return null;

    const catChecked = list.every((v) => checkedIds.has(v.id));
    const catIndeterminate = !catChecked && list.some((v) => checkedIds.has(v.id));

    const toggleCategory = () => {
      setCheckedIds((prev) => {
        const next = new Set(prev);
        if (catChecked) {
          list.forEach((v) => next.delete(v.id));
        } else {
          list.forEach((v) => next.add(v.id));
        }
        return next;
      });
    };

    return (
      <div key={categoryKey} className="overflow-hidden rounded-md border border-gray-200 bg-white">
        {/* 카테고리 헤더 */}
        <div className="flex items-center gap-2 bg-gray-50 px-4 py-2">
          <input
            type="checkbox"
            checked={catChecked}
            ref={(el) => { if (el) el.indeterminate = catIndeterminate; }}
            onChange={toggleCategory}
            className="h-4 w-4 cursor-pointer accent-primary-600"
            title={`${label} 전체 선택`}
          />
          <span className="text-sm font-semibold text-gray-900">{label}</span>
        </div>
        {/* 업체 행 */}
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-100">
            {list.map((v) => (
              <tr
                key={v.id}
                className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                  checkedIds.has(v.id) ? "" : "opacity-50"
                }`}
                onClick={() => toggle(v.id)}
              >
                <td className="w-10 px-4 py-2">
                  <input
                    type="checkbox"
                    checked={checkedIds.has(v.id)}
                    onChange={() => toggle(v.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 cursor-pointer accent-primary-600"
                  />
                </td>
                <td className="px-2 py-2 font-medium text-gray-900">{v.name}</td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/reports/vendor/${v.id}?${periodQs}`}
                    className="text-primary-600 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    보고서 보기
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 상단 툴바: 전체선택 + 통합 요약 버튼 */}
      <div className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-4 py-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={allChecked}
            ref={(el) => { if (el) el.indeterminate = someChecked; }}
            onChange={toggleAll}
            className="h-4 w-4 cursor-pointer accent-primary-600"
          />
          전체 선택&nbsp;
          <span className="text-xs text-gray-400">
            ({checkedIds.size}/{allIds.length}개 업체 선택됨)
          </span>
        </label>
        <Link
          href={summaryHref}
          className={`rounded border px-3 py-1.5 text-sm font-medium transition-colors ${
            checkedIds.size === 0
              ? "cursor-not-allowed border-gray-200 text-gray-300"
              : "border-primary-300 text-primary-700 hover:bg-primary-50"
          }`}
          onClick={(e) => { if (checkedIds.size === 0) e.preventDefault(); }}
        >
          선택 업체 통합 요약 보기
          {checkedIds.size < allIds.length && checkedIds.size > 0 && (
            <span className="ml-1 rounded-full bg-primary-100 px-1.5 py-0.5 text-xs text-primary-700">
              {checkedIds.size}
            </span>
          )}
        </Link>
      </div>

      {/* 카테고리별 벤더 목록 */}
      {CATEGORIES.map((cat) => renderCategoryBlock(cat, CATEGORY_LABELS[cat]))}
      {renderCategoryBlock("UNCATEGORIZED", "미분류")}
    </div>
  );
}
