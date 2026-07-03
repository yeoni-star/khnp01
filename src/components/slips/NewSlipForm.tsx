"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createDraftSlip } from "@/actions/slip-actions";
import { TAX_TYPES, TAX_TYPE_LABELS } from "@/lib/tax";

type ActionState = { ok: boolean; message?: string } | null;

export default function NewSlipForm({
  contracts,
  defaultVendor,
}: {
  contracts: { id: string; title: string | null; vendorId: string; vendor: { name: string }; startDate: Date; endDate: Date }[];
  defaultVendor: { id: string; name: string; categoryLabel: string | null } | null;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (_prev, formData) => createDraftSlip(formData),
    null
  );

  const today = new Date().toISOString().slice(0, 10);
  const [dateStr, setDateStr] = useState(today);

  // 달력 관련 상태
  const [currentYear, setCurrentYear] = useState(() => new Date(dateStr).getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date(dateStr).getMonth()); // 0-indexed

  // 이전 달로 이동
  const prevMonth = () => {
    setCurrentMonth((m) => {
      if (m === 0) {
        setCurrentYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  };

  // Next month
  const nextMonth = () => {
    setCurrentMonth((m) => {
      if (m === 11) {
        setCurrentYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  };

  // Month days builder
  const getDaysInMonth = (year: number, month: number) => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const days: { date: string; dayNum: number; isCurrentMonth: boolean }[] = [];
    
    // Fill prev month days
    const prevMonthLastDate = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevYear = month === 0 ? year - 1 : year;
      const prevMon = month === 0 ? 11 : month - 1;
      const d = prevMonthLastDate - i;
      const dateString = `${prevYear}-${String(prevMon + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ date: dateString, dayNum: d, isCurrentMonth: false });
    }
    
    // Fill current month days
    for (let i = 1; i <= lastDate; i++) {
      const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      days.push({ date: dateString, dayNum: i, isCurrentMonth: true });
    }

    // Fill next month days
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const nextYear = month === 11 ? year + 1 : year;
      const nextMon = month === 11 ? 0 : month + 1;
      const dateString = `${nextYear}-${String(nextMon + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      days.push({ date: dateString, dayNum: i, isCurrentMonth: false });
    }

    return days;
  };

  const days = getDaysInMonth(currentYear, currentMonth);
  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

  const filteredContracts = contracts.filter((c) => {
    const sDate = c.startDate.toISOString().slice(0, 10);
    const eDate = c.endDate.toISOString().slice(0, 10);
    return sDate <= dateStr && eDate >= dateStr;
  });

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start">
      {/* 1. 상단/좌측 인라인 달력 카드 */}
      <div className="w-full md:w-80 rounded-md border border-gray-200 bg-white p-4 shadow-sm flex-shrink-0">
        <div className="mb-3 flex items-center justify-between border-b pb-2">
          <button type="button" onClick={prevMonth} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded text-xs font-bold transition cursor-pointer">
            &lt; 이전달
          </button>
          <span className="text-sm font-bold text-gray-800">
            {currentYear}년 {currentMonth + 1}월
          </span>
          <button type="button" onClick={nextMonth} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded text-xs font-bold transition cursor-pointer">
            다음달 &gt;
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-gray-500 mb-2">
          {weekDays.map((d) => (
            <div key={d} className={d === "일" ? "text-red-500" : d === "토" ? "text-blue-500" : ""}>
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const isSelected = day.date === dateStr;
            const dObj = new Date(day.date);
            const isSunday = dObj.getDay() === 0;
            const isSaturday = dObj.getDay() === 6;

            return (
              <button
                key={day.date}
                type="button"
                onClick={() => {
                  setDateStr(day.date);
                  const d = new Date(day.date);
                  setCurrentYear(d.getFullYear());
                  setCurrentMonth(d.getMonth());
                }}
                className={`py-1.5 text-xs rounded transition flex items-center justify-center font-medium ${
                  isSelected
                    ? "bg-primary-600 text-white font-bold"
                    : !day.isCurrentMonth
                    ? "text-gray-300 hover:bg-gray-50 cursor-pointer"
                    : isSunday
                    ? "text-red-500 hover:bg-gray-100 cursor-pointer"
                    : isSaturday
                    ? "text-blue-500 hover:bg-gray-100 cursor-pointer"
                    : "text-gray-700 hover:bg-gray-100 cursor-pointer"
                }`}
              >
                {day.dayNum}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. 기존 입력 폼 영역 */}
      <form action={formAction} className="flex-1 w-full space-y-4 rounded-md border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">납품일자 *</label>
            <input
              type="date"
              name="deliveryDate"
              required
              value={dateStr}
              onChange={(e) => {
                const val = e.target.value;
                setDateStr(val);
                if (val) {
                  const d = new Date(val);
                  if (!Number.isNaN(d.getTime())) {
                    setCurrentYear(d.getFullYear());
                    setCurrentMonth(d.getMonth());
                  }
                }
              }}
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">계약 *</label>
            {defaultVendor ? (
              <div>
                <input type="hidden" name="vendorId" value={defaultVendor.id} />
                <p className="rounded border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm text-gray-900 font-semibold">
                  {defaultVendor.name}
                  {defaultVendor.categoryLabel ? ` (${defaultVendor.categoryLabel})` : ""}
                </p>
                <Link href="/slips/new" className="mt-1 inline-block text-xs text-primary-600 hover:underline">
                  다른 계약 선택
                </Link>
              </div>
            ) : (
              <select
                name="vendorId"
                required
                defaultValue=""
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
              >
                <option value="" disabled>
                  계약 선택 ({filteredContracts.length}건)
                </option>
                {filteredContracts.map((c) => (
                  <option key={c.id} value={c.vendorId}>
                    [{c.vendor.name}] {c.title || `${c.startDate.toISOString().slice(0, 10)} 계약`}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">면세/과세 *</label>
          <div className="flex gap-6">
            {TAX_TYPES.map((code) => (
              <label key={code} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="taxType"
                  value={code}
                  defaultChecked={code === "TAXABLE"}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                />
                {TAX_TYPE_LABELS[code]}
              </label>
            ))}
          </div>
        </div>

        {state && !state.ok && <p className="text-sm text-red-600 font-medium">{state.message}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50 cursor-pointer transition"
        >
          {pending ? "생성 중..." : "다음: 품목 입력"}
        </button>
      </form>
    </div>
  );
}
