import { db } from "./db";
import type { RestaurantCode } from "./restaurants";
import { CATEGORIES, type CategoryCode } from "./categories";
import { TAX_TYPES, type TaxTypeCode } from "./tax";

export type SummaryItemRow = {
  itemName: string;
  unit: string;
  totalQuantity: number;
  unitPrice: number;
  totalAmount: number;
  totalTaxAmount: number;
  priceVaries: boolean;
  vendorName: string;
};

export type SummaryCategorySection = {
  category: CategoryCode;
  items: SummaryItemRow[];
  subtotal: number;
};

export type SummaryTaxSection = {
  taxType: TaxTypeCode;
  categories: SummaryCategorySection[];
  supplySubtotal: number;
  taxSubtotal: number;
};

export type SummaryReport = {
  taxSections: SummaryTaxSection[];
  taxableSupplyTotal: number;
  taxableTaxTotal: number;
  exemptSupplyTotal: number;
  grandTotal: number;
};

export type SummaryInputRow = {
  category: CategoryCode;
  itemName: string;
  unit: string;
  taxType: TaxTypeCode;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxAmount: number | null;
  vendorName: string;
};

/** 순수 집계 함수: 전체 통합 요약(문서B) - 과세/면세 > 카테고리(고정 순서) > 품목별 합계, 소계, 합계 */
export function aggregateSummaryReport(rows: SummaryInputRow[]): SummaryReport {
  const grouped = new Map<
    string,
    {
      taxType: TaxTypeCode;
      category: CategoryCode;
      itemName: string;
      unit: string;
      vendorName: string;
      totalQuantity: number;
      totalAmount: number;
      totalTaxAmount: number;
      prices: Set<number>;
    }
  >();

  for (const row of rows) {
    const key = `${row.taxType}__${row.category}__${row.itemName.trim().toLowerCase()}__${row.unit.trim().toLowerCase()}__${row.vendorName.trim().toLowerCase()}`;
    const entry =
      grouped.get(key) ??
      {
        taxType: row.taxType,
        category: row.category,
        itemName: row.itemName,
        unit: row.unit,
        vendorName: row.vendorName,
        totalQuantity: 0,
        totalAmount: 0,
        totalTaxAmount: 0,
        prices: new Set<number>(),
      };
    entry.totalQuantity += row.quantity;
    entry.totalAmount += row.amount;
    entry.totalTaxAmount += row.taxAmount ?? 0;
    entry.prices.add(row.unitPrice);
    grouped.set(key, entry);
  }

  const taxSections: SummaryTaxSection[] = TAX_TYPES.slice()
    .sort((a, b) => (a === "TAXABLE" ? -1 : b === "TAXABLE" ? 1 : 0))
    .map((taxType) => {
      const categories: SummaryCategorySection[] = CATEGORIES.map((category) => {
        const items = Array.from(grouped.values())
          .filter((entry) => entry.taxType === taxType && entry.category === category)
          .sort((a, b) => a.itemName.localeCompare(b.itemName, "ko"))
          .map((entry) => ({
            itemName: entry.itemName,
            unit: entry.unit,
            vendorName: entry.vendorName,
            totalQuantity: entry.totalQuantity,
            unitPrice: entry.totalQuantity > 0 ? Math.round(entry.totalAmount / entry.totalQuantity) : 0,
            totalAmount: entry.totalAmount,
            totalTaxAmount: entry.totalTaxAmount,
            priceVaries: entry.prices.size > 1,
          }));
        const subtotal = items.reduce((sum, item) => sum + item.totalAmount, 0);
        return { category, items, subtotal };
      }).filter((section) => section.items.length > 0);

      const supplySubtotal = categories.reduce((sum, c) => sum + c.subtotal, 0);
      const taxSubtotal = Array.from(grouped.values())
        .filter((entry) => entry.taxType === taxType)
        .reduce((sum, entry) => sum + entry.totalTaxAmount, 0);

      return { taxType, categories, supplySubtotal, taxSubtotal };
    })
    .filter((section) => section.categories.length > 0);

  const taxableSection = taxSections.find((s) => s.taxType === "TAXABLE");
  const exemptSection = taxSections.find((s) => s.taxType === "EXEMPT");
  const taxableSupplyTotal = taxableSection?.supplySubtotal ?? 0;
  const taxableTaxTotal = taxableSection?.taxSubtotal ?? 0;
  const exemptSupplyTotal = exemptSection?.supplySubtotal ?? 0;
  const grandTotal = taxableSupplyTotal + taxableTaxTotal + exemptSupplyTotal;

  return { taxSections, taxableSupplyTotal, taxableTaxTotal, exemptSupplyTotal, grandTotal };
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
    include: { slip: { include: { vendor: true } } },
  });

  const rows: SummaryInputRow[] = items
    .filter((item): item is typeof item & { category: CategoryCode } => item.category !== null)
    .map((item) => ({
      category: item.category,
      itemName: item.itemName,
      unit: item.unit,
      taxType: item.slip.taxType,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.amount,
      taxAmount: item.taxAmount,
      vendorName: item.slip.vendor?.name ?? "",
    }));

  return aggregateSummaryReport(rows);
}
