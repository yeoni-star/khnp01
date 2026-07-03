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
  // 계약 단가표의 카테고리 맵핑 딕셔너리 구축
  const contractItems = await db.contractItem.findMany({
    select: {
      itemName: true,
      unit: true,
      category: true,
    },
  });

  const contractCategoryMap = new Map<string, CategoryCode>();
  for (const ci of contractItems) {
    const key = `${ci.itemName.trim().toLowerCase()}__${ci.unit.trim().toLowerCase()}`;
    contractCategoryMap.set(key, ci.category as CategoryCode);
  }

  const items = await db.deliverySlipItem.findMany({
    where: {
      slip: {
        restaurant,
        status: "CONFIRMED",
        deliveryDate: { gte: startDate, lte: endDate },
        ...(filters?.vendorId ? { vendorId: filters.vendorId } : {}),
      },
    },
  });

  let rows: QuantityInputRow[] = items.map((item) => {
    const key = `${item.itemName.trim().toLowerCase()}__${item.unit.trim().toLowerCase()}`;
    const category = contractCategoryMap.get(key) ?? (item.category as CategoryCode | null);

    return {
      itemName: item.itemName,
      category,
      unit: item.unit,
      quantity: item.quantity,
    };
  });

  if (filters?.category) {
    rows = rows.filter((r) => r.category === filters.category);
  }

  return aggregateQuantity(rows);
}
