"use client";

import { useRouter } from "next/navigation";
import { currentMonthStr, shiftMonth, todayStr } from "@/lib/month-range";

const WEEK_DAYS = ["일", "월", "화", "수", "목", "금", "토"];

function getDaysInMonth(year: number, month: number) {
  const firstDayIndex = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const days: { date: string; dayNum: number; isCurrentMonth: boolean }[] = [];

  const prevMonthLastDate = new Date(year, month, 0).getDate();
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const prevYear = month === 0 ? year - 1 : year;
    const prevMon = month === 0 ? 11 : month - 1;
    const d = prevMonthLastDate - i;
    const dateString = `${prevYear}-${String(prevMon + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ date: dateString, dayNum: d, isCurrentMonth: false });
  }

  for (let i = 1; i <= lastDate; i++) {
    const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    days.push({ date: dateString, dayNum: i, isCurrentMonth: true });
  }

  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    const nextYear = month === 11 ? year + 1 : year;
    const nextMon = month === 11 ? 0 : month + 1;
    const dateString = `${nextYear}-${String(nextMon + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    days.push({ date: dateString, dayNum: i, isCurrentMonth: false });
  }

  return days;
}

export default function MonthCalendar({
  basePath,
  month,
  markedDates,
  legendLabel,
  draftDates,
  draftLegendLabel,
  selectedDate,
}: {
  basePath: string;
  month: string;
  markedDates: string[];
  legendLabel: string;
  /** 임시저장 상태인 항목이 있는 날짜. 지정하면 주황색 점으로 별도 표시된다. */
  draftDates?: string[];
  draftLegendLabel?: string;
  /** 현재 목록이 필터링된 날짜(YYYY-MM-DD). 지정하면 달력에서 해당 날짜가 강조된다. */
  selectedDate?: string;
}) {
  const router = useRouter();
  const today = todayStr();
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthIdx = Number(monthStr) - 1;

  const markedSet = new Set(markedDates);
  const draftSet = new Set(draftDates ?? []);
  const days = getDaysInMonth(year, monthIdx);
  const canGoNext = month !== currentMonthStr();

  function goToMonth(delta: number) {
    router.push(`${basePath}?month=${shiftMonth(month, delta)}`);
  }

  function toggleDate(date: string) {
    if (date === selectedDate) {
      router.push(`${basePath}?month=${month}`);
    } else {
      router.push(`${basePath}?month=${month}&date=${date}`);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-md border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between border-b pb-2">
        <button
          type="button"
          onClick={() => goToMonth(-1)}
          className="rounded p-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100"
        >
          &lt; 이전달
        </button>
        <span className="text-sm font-bold text-gray-800">
          {year}년 {monthIdx + 1}월
        </span>
        {canGoNext ? (
          <button
            type="button"
            onClick={() => goToMonth(1)}
            className="rounded p-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100"
          >
            다음달 &gt;
          </button>
        ) : (
          <span className="p-1.5 text-xs font-bold text-transparent">다음달 &gt;</span>
        )}
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-bold text-gray-500">
        {WEEK_DAYS.map((d) => (
          <div key={d} className={d === "일" ? "text-red-500" : d === "토" ? "text-blue-500" : ""}>
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isMarked = markedSet.has(day.date);
          const isDraftMarked = draftSet.has(day.date);
          const isToday = day.date === today;
          const isSelected = day.date === selectedDate;
          const className = `relative flex flex-col items-center justify-center rounded py-1.5 text-xs font-medium transition ${
            !day.isCurrentMonth
              ? "text-gray-300"
              : isToday
              ? "bg-primary-600 font-bold text-white"
              : isSelected
              ? "bg-primary-50 font-bold text-primary-700"
              : "text-gray-700"
          } ${day.isCurrentMonth ? "cursor-pointer hover:bg-gray-100" : ""} ${
            isSelected ? "ring-2 ring-primary-600 ring-offset-1" : ""
          }`;
          const content = (
            <>
              {day.dayNum}
              {(isMarked || isDraftMarked) && (
                <span className="mt-0.5 flex items-center gap-0.5">
                  {isMarked && (
                    <span className={`h-1.5 w-1.5 rounded-full ${isToday ? "bg-white" : "bg-primary-600"}`} />
                  )}
                  {isDraftMarked && (
                    <span className={`h-1.5 w-1.5 rounded-full ${isToday ? "bg-white/70" : "bg-amber-400"}`} />
                  )}
                </span>
              )}
            </>
          );
          if (day.isCurrentMonth) {
            return (
              <button key={day.date} type="button" onClick={() => toggleDate(day.date)} className={className}>
                {content}
              </button>
            );
          }
          return (
            <div key={day.date} className={className}>
              {content}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <p className="flex items-center gap-1 text-xs text-gray-500">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary-600" /> {legendLabel}
          </p>
          {draftDates && draftLegendLabel && (
            <p className="flex items-center gap-1 text-xs text-gray-500">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" /> {draftLegendLabel}
            </p>
          )}
        </div>
        {selectedDate && (
          <button
            type="button"
            onClick={() => router.push(`${basePath}?month=${month}`)}
            className="text-xs font-medium text-primary-600 hover:underline"
          >
            {monthIdx + 1}월 전체보기
          </button>
        )}
      </div>
    </div>
  );
}
