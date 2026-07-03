import { db } from "./db";
import type { RestaurantCode } from "./restaurants";
import type { CategoryCode } from "./categories";
import type { TaxTypeCode } from "./tax";

/** 납품보고서 상단 "일자" 표기: 해당 월의 말일 기준 YY.M.D (예: 26.5.31) */
export function formatReportIssueDate(year: number, month: number): string {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${String(year).slice(-2)}.${month}.${lastDay}`;
}

export type VendorReportWeek = { label: string; dates: string[] };

export type VendorReportItemRow = {
  itemName: string;
  category: CategoryCode | null;
  unit: string;
  taxType: TaxTypeCode;
  totalQuantity: number;
  unitPrice: number;
  totalAmount: number;
  totalTaxAmount: number;
  priceVaries: boolean;
  quantityByDate: Record<string, number>;
};

export type VendorReport = {
  weeks: VendorReportWeek[];
  taxableItems: VendorReportItemRow[];
  exemptItems: VendorReportItemRow[];
  taxableSupplyTotal: number;
  taxableTaxTotal: number;
  exemptSupplyTotal: number;
  grandTotal: number;
};

export type VendorReportInputRow = {
  deliveryDate: Date;
  itemName: string;
  category: CategoryCode | null;
  unit: string;
  taxType: TaxTypeCode;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxAmount: number | null;
};

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function mondayOf(d: Date): Date {
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const diff = (day + 6) % 7; // 월요일까지의 차이
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - diff);
  return monday;
}

/**
 * 실제 납품이 있는 날짜만 월~일 기준 주 단위로 묶고, 등장 순서대로 1주/2주...로 라벨링한다.
 * (월의 절대 몇 번째 주인지가 아니라, 데이터가 있는 주의 등장 순서)
 */
export function groupDatesIntoWeeks(dateKeys: string[]): VendorReportWeek[] {
  const uniqueSorted = Array.from(new Set(dateKeys)).sort();
  const weekMap = new Map<string, string[]>();

  for (const key of uniqueSorted) {
    const d = new Date(`${key}T00:00:00.000Z`);
    const weekStartKey = toDateKey(mondayOf(d));
    const arr = weekMap.get(weekStartKey) ?? [];
    arr.push(key);
    weekMap.set(weekStartKey, arr);
  }

  const weekStarts = Array.from(weekMap.keys()).sort();
  return weekStarts.map((weekStart, index) => ({
    label: `${index + 1}주`,
    dates: weekMap.get(weekStart)!,
  }));
}

/** 순수 집계 함수: 업체별 납품보고서(문서A) - 과세/면세로 나눈 품목별 합계 + 날짜별 납품현황 매트릭스 */
export function aggregateVendorReport(rows: VendorReportInputRow[]): VendorReport {
  const dateKeys = new Set<string>();
  const itemMap = new Map<
    string,
    {
      itemName: string;
      category: CategoryCode | null;
      unit: string;
      taxType: TaxTypeCode;
      totalQuantity: number;
      totalAmount: number;
      totalTaxAmount: number;
      prices: Set<number>;
      quantityByDate: Record<string, number>;
      firstSeen: string;
    }
  >();

  for (const row of rows) {
    const dateKey = toDateKey(row.deliveryDate);
    dateKeys.add(dateKey);

    const key = `${row.taxType}__${row.itemName.trim().toLowerCase()}__${row.unit.trim().toLowerCase()}`;
    const entry =
      itemMap.get(key) ??
      {
        itemName: row.itemName,
        category: row.category,
        unit: row.unit,
        taxType: row.taxType,
        totalQuantity: 0,
        totalAmount: 0,
        totalTaxAmount: 0,
        prices: new Set<number>(),
        quantityByDate: {},
        firstSeen: dateKey,
      };
    entry.totalQuantity += row.quantity;
    entry.totalAmount += row.amount;
    entry.totalTaxAmount += row.taxAmount ?? 0;
    entry.prices.add(row.unitPrice);
    entry.quantityByDate[dateKey] = (entry.quantityByDate[dateKey] ?? 0) + row.quantity;
    if (dateKey < entry.firstSeen) entry.firstSeen = dateKey;
    itemMap.set(key, entry);
  }

  const allItems: VendorReportItemRow[] = Array.from(itemMap.values())
    .sort((a, b) => {
      if (a.firstSeen !== b.firstSeen) return a.firstSeen < b.firstSeen ? -1 : 1;
      return a.itemName.localeCompare(b.itemName, "ko");
    })
    .map((entry) => ({
      itemName: entry.itemName,
      category: entry.category,
      unit: entry.unit,
      taxType: entry.taxType,
      totalQuantity: entry.totalQuantity,
      unitPrice: entry.totalQuantity > 0 ? Math.round(entry.totalAmount / entry.totalQuantity) : 0,
      totalAmount: entry.totalAmount,
      totalTaxAmount: entry.totalTaxAmount,
      priceVaries: entry.prices.size > 1,
      quantityByDate: entry.quantityByDate,
    }));

  const taxableItems = allItems.filter((i) => i.taxType === "TAXABLE");
  const exemptItems = allItems.filter((i) => i.taxType === "EXEMPT");

  const weeks = groupDatesIntoWeeks(Array.from(dateKeys));
  const taxableSupplyTotal = taxableItems.reduce((sum, i) => sum + i.totalAmount, 0);
  const taxableTaxTotal = taxableItems.reduce((sum, i) => sum + i.totalTaxAmount, 0);
  const exemptSupplyTotal = exemptItems.reduce((sum, i) => sum + i.totalAmount, 0);
  const grandTotal = taxableSupplyTotal + taxableTaxTotal + exemptSupplyTotal;

  return { weeks, taxableItems, exemptItems, taxableSupplyTotal, taxableTaxTotal, exemptSupplyTotal, grandTotal };
}

export async function buildVendorReport(
  restaurant: RestaurantCode,
  vendorId: string,
  year: number,
  month: number
): Promise<VendorReport> {
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const slips = await db.deliverySlip.findMany({
    where: {
      restaurant,
      vendorId,
      status: "CONFIRMED",
      deliveryDate: { gte: monthStart, lte: monthEnd },
    },
    include: { items: true },
    orderBy: { deliveryDate: "asc" },
  });

  const rows: VendorReportInputRow[] = slips.flatMap((slip) =>
    slip.items.map((item) => ({
      deliveryDate: slip.deliveryDate,
      itemName: item.itemName,
      category: item.category,
      unit: item.unit,
      taxType: slip.taxType,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.amount,
      taxAmount: item.taxAmount,
    }))
  );

  return aggregateVendorReport(rows);
}
