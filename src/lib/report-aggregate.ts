import { db } from "./db";
import type { RestaurantCode } from "./restaurants";
import { CATEGORIES, type CategoryCode } from "./categories";

export type SummaryItemRow = {
  itemName: string;
  unit: string;
  totalQuantity: number;
  unitPrice: number;
  totalAmount: number;
  priceVaries: boolean;
};

export type SummaryCategorySection = {
  category: CategoryCode;
  items: SummaryItemRow[];
  subtotal: number;
};

export type SummaryReport = {
  sections: SummaryCategorySection[];
  grandTotal: number;
};

export type SummaryInputRow = {
  category: CategoryCode;
  itemName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

/** 순수 집계 함수: 전체 통합 요약(문서B) - 카테고리(고정 순서) > 품목별 합계, 소계, 합계 */
export function aggregateSummaryReport(rows: SummaryInputRow[]): SummaryReport {
  const grouped = new Map<
    string,
    {
      category: CategoryCode;
      itemName: string;
      unit: string;
      totalQuantity: number;
      totalAmount: number;
      prices: Set<number>;
    }
  >();

  for (const row of rows) {
    const key = `${row.category}__${row.itemName.trim().toLowerCase()}__${row.unit.trim().toLowerCase()}`;
    const entry =
      grouped.get(key) ??
      {
        category: row.category,
        itemName: row.itemName,
        unit: row.unit,
        totalQuantity: 0,
        totalAmount: 0,
        prices: new Set<number>(),
      };
    entry.totalQuantity += row.quantity;
    entry.totalAmount += row.amount;
    entry.prices.add(row.unitPrice);
    grouped.set(key, entry);
  }

  const sections: SummaryCategorySection[] = CATEGORIES.map((category) => {
    const items = Array.from(grouped.values())
      .filter((entry) => entry.category === category)
      .sort((a, b) => a.itemName.localeCompare(b.itemName, "ko"))
      .map((entry) => ({
        itemName: entry.itemName,
        unit: entry.unit,
        totalQuantity: entry.totalQuantity,
        unitPrice: entry.totalQuantity > 0 ? Math.round(entry.totalAmount / entry.totalQuantity) : 0,
        totalAmount: entry.totalAmount,
        priceVaries: entry.prices.size > 1,
      }));
    const subtotal = items.reduce((sum, item) => sum + item.totalAmount, 0);
    return { category, items, subtotal };
  }).filter((section) => section.items.length > 0);

  const grandTotal = sections.reduce((sum, section) => sum + section.subtotal, 0);
  return { sections, grandTotal };
}

export async function buildSummaryReport(
  restaurant: RestaurantCode,
  year: number,
  month: number
): Promise<SummaryReport> {
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const items = await db.deliverySlipItem.findMany({
    where: {
      slip: {
        restaurant,
        status: "CONFIRMED",
        deliveryDate: { gte: monthStart, lte: monthEnd },
      },
    },
  });

  const rows: SummaryInputRow[] = items
    .filter((item): item is typeof item & { category: CategoryCode } => item.category !== null)
    .map((item) => ({
      category: item.category,
      itemName: item.itemName,
      unit: item.unit,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.amount,
    }));

  return aggregateSummaryReport(rows);
}
