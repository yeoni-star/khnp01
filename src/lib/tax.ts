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
