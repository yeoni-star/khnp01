export const TAX_TYPES = ["TAXABLE", "EXEMPT"] as const;

export type TaxTypeCode = (typeof TAX_TYPES)[number];

export const TAX_TYPE_LABELS: Record<TaxTypeCode, string> = {
  TAXABLE: "과세",
  EXEMPT: "면세",
};

export function isTaxTypeCode(value: string): value is TaxTypeCode {
  return (TAX_TYPES as readonly string[]).includes(value);
}

const VAT_RATE = 0.1;

export function computeTaxAmount(supplyAmount: number): number {
  return Math.round(supplyAmount * VAT_RATE);
}

/**
 * 거래명세표 한 줄의 세액.
 * 계약 단가표에 단위당 세액이 입력된 품목(단가를 계약 그대로 쓴 경우)은 그 세액 × 수량을 쓰고,
 * 입력된 세액이 없거나 단가를 바꾼 경우에는 금액의 10%로 자동 계산한다.
 */
export function computeLineTaxAmount(args: {
  quantity: number;
  unitPrice: number;
  contractItem?: { unitPrice: number; taxAmount?: number | null } | null;
}): number {
  const { quantity, unitPrice, contractItem } = args;
  if (contractItem && contractItem.taxAmount != null && contractItem.unitPrice === unitPrice) {
    return Math.round(contractItem.taxAmount * quantity);
  }
  return computeTaxAmount(quantity * unitPrice);
}
