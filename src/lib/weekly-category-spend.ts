import { db } from "./db";
import type { RestaurantCode } from "./restaurants";
import { CATEGORIES, type CategoryCode } from "./categories";
import { currentMonthStr, getMonthRange, shiftMonth } from "./month-range";

export type WeeklyCategorySpendRow = {
  category: CategoryCode;
  lastMonthWeeklyAvg: number;
  thisMonthWeeklyAvg: number;
};

export type WeeklyCategorySpendReport = {
  rows: WeeklyCategorySpendRow[];
  lastMonthLabel: string;
  thisMonthLabel: string;
  thisMonthDaysElapsed: number;
};

type AmountInput = { category: CategoryCode; amount: number };

/** 순수 집계 함수: 카테고리별 합계 금액을 일수 기준 주간 평균으로 환산한다. */
export function aggregateWeeklyCategorySpend(
  lastMonthItems: AmountInput[],
  thisMonthItems: AmountInput[],
  thisMonthDaysElapsed: number,
  lastMonthDays: number
): WeeklyCategorySpendRow[] {
  const lastMonthTotals = new Map<CategoryCode, number>();
  for (const item of lastMonthItems) {
    lastMonthTotals.set(item.category, (lastMonthTotals.get(item.category) ?? 0) + item.amount);
  }
  const thisMonthTotals = new Map<CategoryCode, number>();
  for (const item of thisMonthItems) {
    thisMonthTotals.set(item.category, (thisMonthTotals.get(item.category) ?? 0) + item.amount);
  }

  const lastMonthWeeks = lastMonthDays / 7;
  const thisMonthWeeks = Math.max(1, thisMonthDaysElapsed) / 7;

  return CATEGORIES.map((category) => ({
    category,
    lastMonthWeeklyAvg: Math.round((lastMonthTotals.get(category) ?? 0) / lastMonthWeeks),
    thisMonthWeeklyAvg: Math.round((thisMonthTotals.get(category) ?? 0) / thisMonthWeeks),
  }));
}

export async function buildWeeklyCategorySpendReport(restaurant: RestaurantCode): Promise<WeeklyCategorySpendReport> {
  const thisMonth = currentMonthStr();
  const lastMonth = shiftMonth(thisMonth, -1);
  const thisMonthRange = getMonthRange(thisMonth);
  const lastMonthRange = getMonthRange(lastMonth);

  const now = new Date();
  const thisMonthDaysElapsed = now.getUTCDate();
  const lastMonthDays = Math.round(
    (lastMonthRange.end.getTime() - lastMonthRange.start.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  const [lastMonthRows, thisMonthRows] = await Promise.all([
    db.deliverySlipItem.findMany({
      where: {
        slip: { restaurant, status: "CONFIRMED", deliveryDate: { gte: lastMonthRange.start, lte: lastMonthRange.end } },
      },
      select: { category: true, amount: true },
    }),
    db.deliverySlipItem.findMany({
      where: {
        slip: { restaurant, status: "CONFIRMED", deliveryDate: { gte: thisMonthRange.start, lte: now } },
      },
      select: { category: true, amount: true },
    }),
  ]);

  const toAmountInput = (rows: { category: CategoryCode | null; amount: number }[]): AmountInput[] =>
    rows.filter((r): r is { category: CategoryCode; amount: number } => r.category !== null);

  const rows = aggregateWeeklyCategorySpend(
    toAmountInput(lastMonthRows),
    toAmountInput(thisMonthRows),
    thisMonthDaysElapsed,
    lastMonthDays
  );

  return {
    rows,
    lastMonthLabel: lastMonth,
    thisMonthLabel: thisMonth,
    thisMonthDaysElapsed,
  };
}
