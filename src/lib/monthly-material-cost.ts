import { db } from "./db";
import { getMonthRange } from "./month-range";
import { RESTAURANTS, type RestaurantCode } from "./restaurants";
import type { MaterialCost } from "./profit-calc";

export type MonthlyMaterialCost = Record<RestaurantCode, MaterialCost>;

type CostRow = { restaurant: RestaurantCode; amount: number; taxAmount: number | null };

/** 순수 집계 함수: 식당별로 공급가액 합계와 세액 합계를 구한다. 면세 품목의 세액(null)은 0으로 본다. */
export function aggregateMonthlyMaterialCost(rows: CostRow[]): MonthlyMaterialCost {
  const result = Object.fromEntries(RESTAURANTS.map((r) => [r, { supply: 0, tax: 0 }])) as MonthlyMaterialCost;
  for (const row of rows) {
    result[row.restaurant].supply += row.amount;
    result[row.restaurant].tax += row.taxAmount ?? 0;
  }
  return result;
}

/** 해당 월에 납품된 확정 거래명세표의 식재료비를 식당별로 자동 집계한다. */
export async function getMonthlyMaterialCost(month: string): Promise<MonthlyMaterialCost> {
  const { start, end } = getMonthRange(month);
  const items = await db.deliverySlipItem.findMany({
    where: { slip: { status: "CONFIRMED", deliveryDate: { gte: start, lte: end } } },
    select: { amount: true, taxAmount: true, slip: { select: { restaurant: true } } },
  });
  return aggregateMonthlyMaterialCost(
    items.map((i) => ({ restaurant: i.slip.restaurant, amount: i.amount, taxAmount: i.taxAmount }))
  );
}
