import { db } from "./db";
import type { RestaurantCode } from "./restaurants";
import type { CategoryCode } from "./categories";

export type QuantityRow = {
  itemName: string;
  category: CategoryCode | null;
  unit: string;
  totalQuantity: number;
};

export type QuantityInputRow = {
  itemName: string;
  category: CategoryCode | null;
  unit: string;
  quantity: number;
};

/** 순수 집계 함수: 소요수량 산출 - 단가/금액 없이 품목+단위별 수량만 합산 */
export function aggregateQuantity(rows: QuantityInputRow[]): QuantityRow[] {
  const grouped = new Map<string, QuantityRow>();
  for (const row of rows) {
    const key = `${row.itemName.trim().toLowerCase()}__${row.unit.trim().toLowerCase()}`;
    const entry = grouped.get(key) ?? {
      itemName: row.itemName,
      category: row.category,
      unit: row.unit,
      totalQuantity: 0,
    };
    entry.totalQuantity += row.quantity;
    grouped.set(key, entry);
  }
  return Array.from(grouped.values()).sort((a, b) => a.itemName.localeCompare(b.itemName, "ko"));
}

export async function buildQuantityReport(
  restaurant: RestaurantCode,
  startDate: Date,
  endDate: Date,
  filters?: { vendorId?: string; category?: CategoryCode }
): Promise<QuantityRow[]> {
  const items = await db.deliverySlipItem.findMany({
    where: {
      category: filters?.category,
      slip: {
        restaurant,
        status: "CONFIRMED",
        deliveryDate: { gte: startDate, lte: endDate },
        ...(filters?.vendorId ? { vendorId: filters.vendorId } : {}),
      },
    },
  });

  const rows: QuantityInputRow[] = items.map((item) => ({
    itemName: item.itemName,
    category: item.category,
    unit: item.unit,
    quantity: item.quantity,
  }));

  return aggregateQuantity(rows);
}
