"use client";

import { useState, useEffect } from "react";
import { defaultMealScheduleEnabled } from "@/lib/meal";

type RestaurantCode = "A" | "B";
type MealTypeCode = "LUNCH" | "DINNER";
type Cell = { restaurant: RestaurantCode; mealType: MealTypeCode; enabled: boolean };
type Day = { date: string; weekdayLabel: string; cells: Cell[] };

const RESTAURANTS: RestaurantCode[] = ["A", "B"];
const MEAL_TYPES: MealTypeCode[] = ["LUNCH", "DINNER"];
const RESTAURANT_LABELS: Record<RestaurantCode, string> = { A: "본관", B: "후문" };
const MEAL_TYPE_LABELS: Record<MealTypeCode, string> = { LUNCH: "중식", DINNER: "석식" };
const MEAL_TYPE_SHORT_LABELS: Record<MealTypeCode, string> = { LUNCH: "중", DINNER: "석" };

function formatMonthDay(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${Number(m)}/${Number(d)}`;
}

function getCell(day: Day, restaurant: RestaurantCode, mealType: MealTypeCode) {
  return day.cells.find((c) => c.restaurant === restaurant && c.mealType === mealType);
}

export default function MealDailySchedulePanel() {
  const [days, setDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/meal-daily-schedule")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setDays(d.days);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function applyLocal(dates: string[], restaurant: RestaurantCode, mealType: MealTypeCode, enabled: boolean) {
    setDays((prev) =>
      prev.map((d) =>
        dates.includes(d.date)
          ? {
              ...d,
              cells: d.cells.map((c) =>
                c.restaurant === restaurant && c.mealType === mealType ? { ...c, enabled } : c
              ),
            }
          : d
      )
    );
  }

  async function toggle(date: string, restaurant: RestaurantCode, mealType: MealTypeCode) {
    const key = `${date}_${restaurant}_${mealType}`;
    const day = days.find((d) => d.date === date);
    const cell = day && getCell(day, restaurant, mealType);
    if (!cell) return;
    const nextEnabled = !cell.enabled;

    applyLocal([date], restaurant, mealType, nextEnabled);
    setSavingKey(key);
    setError(null);
    try {
      const res = await fetch("/api/meal-daily-schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, restaurant, mealType, enabled: nextEnabled }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
    } catch {
      applyLocal([date], restaurant, mealType, !nextEnabled);
      setError("저장에 실패했습니다.");
    } finally {
      setSavingKey(null);
    }
  }

  async function bulkApply(restaurant: RestaurantCode, mealType: MealTypeCode, enabled: boolean) {
    const dates = days.map((d) => d.date);
    if (dates.length === 0) return;
    const key = `bulk_${restaurant}_${mealType}`;
    const prevStates = days.map((d) => getCell(d, restaurant, mealType)?.enabled ?? defaultMealScheduleEnabled(mealType));

    applyLocal(dates, restaurant, mealType, enabled);
    setSavingKey(key);
    setError(null);
    try {
      const res = await fetch("/api/meal-daily-schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dates, restaurant, mealType, enabled }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
    } catch {
      setDays((prev) =>
        prev.map((d, i) => ({
          ...d,
          cells: d.cells.map((c) =>
            c.restaurant === restaurant && c.mealType === mealType ? { ...c, enabled: prevStates[i] } : c
          ),
        }))
      );
      setError("일괄 적용에 실패했습니다.");
    } finally {
      setSavingKey(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-md border border-gray-200 bg-white p-5 shadow-sm animate-pulse">
        <div className="mb-4 h-4 w-40 rounded bg-gray-100"></div>
        <div className="h-64 rounded bg-gray-100"></div>
      </div>
    );
  }

  function renderWeekGrid(week: Day[], restaurant: RestaurantCode) {
    return (
      <div className="overflow-x-auto">
        <div className="grid min-w-[340px] grid-cols-5 gap-1.5">
          {week.map((day) => {
            const lunch = getCell(day, restaurant, "LUNCH");
            const dinner = getCell(day, restaurant, "DINNER");
            return (
              <div key={day.date} className="rounded-md border border-gray-200 p-1.5 text-center">
                <p
                  className={`whitespace-nowrap text-xs font-bold ${
                    day.weekdayLabel === "일"
                      ? "text-red-500"
                      : day.weekdayLabel === "토"
                      ? "text-blue-500"
                      : "text-gray-700"
                  }`}
                >
                  {formatMonthDay(day.date)} ({day.weekdayLabel})
                </p>
                <div className="mt-1 flex justify-center gap-1">
                  {MEAL_TYPES.map((mealType) => {
                    const cell = mealType === "LUNCH" ? lunch : dinner;
                    const enabled = cell?.enabled ?? defaultMealScheduleEnabled(mealType);
                    const cellKey = `${day.date}_${restaurant}_${mealType}`;
                    return (
                      <button
                        key={mealType}
                        type="button"
                        onClick={() => toggle(day.date, restaurant, mealType)}
                        disabled={savingKey === cellKey}
                        title={`${RESTAURANT_LABELS[restaurant]} ${MEAL_TYPE_LABELS[mealType]}`}
                        className={`h-9 w-9 shrink-0 rounded text-xs font-bold transition disabled:opacity-60 ${
                          enabled
                            ? mealType === "LUNCH"
                              ? "bg-primary-600 text-white"
                              : "bg-orange-500 text-white"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {MEAL_TYPE_SHORT_LABELS[mealType]}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderRestaurantCalendar(restaurant: RestaurantCode) {
    return (
      <div key={restaurant} className="flex-1 rounded-md border border-gray-200 p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="shrink-0 text-sm font-bold text-gray-900">{RESTAURANT_LABELS[restaurant]}</h3>
          <div className="flex flex-wrap justify-end gap-x-3 gap-y-1">
            {MEAL_TYPES.map((mealType) => {
              const bulkKey = `bulk_${restaurant}_${mealType}`;
              return (
                <div key={mealType} className="flex items-center gap-1 whitespace-nowrap text-[11px]">
                  <span className="font-medium text-gray-500">{MEAL_TYPE_LABELS[mealType]}</span>
                  <button
                    type="button"
                    onClick={() => bulkApply(restaurant, mealType, true)}
                    disabled={savingKey === bulkKey}
                    className="rounded border border-gray-300 px-1.5 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                  >
                    전체 운영
                  </button>
                  <button
                    type="button"
                    onClick={() => bulkApply(restaurant, mealType, false)}
                    disabled={savingKey === bulkKey}
                    className="rounded border border-gray-300 px-1.5 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                  >
                    전체 휴무
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {renderWeekGrid(days, restaurant)}
      </div>
    );
  }

  return (
    <div className="rounded-md border border-gray-200 bg-white p-3 shadow-sm sm:p-5">
      <h2 className="mb-1 text-sm font-semibold text-gray-900">식당 운영 달력 (평일 1주)</h2>
      <p className="mb-4 text-xs text-gray-500">
        날짜 칸의 중/석 버튼을 눌러 운영 여부를 전환하세요. 꺼두면 해당 날짜·식당·끼니는 식사 등록 폼 제출 시
        거부됩니다. 중식은 기본 운영, 석식은 기본 미운영이며 지난 날짜는 자동으로 정리됩니다.
      </p>
      <div className="flex flex-col gap-4 md:flex-row">{RESTAURANTS.map((r) => renderRestaurantCalendar(r))}</div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
