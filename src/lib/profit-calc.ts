export type TaxMode = "INCLUDED" | "EXCLUDED";

export type MaterialCost = { supply: number; tax: number };

export const TAX_MODE_LABELS: Record<TaxMode, string> = {
  INCLUDED: "세액 포함",
  EXCLUDED: "세액 미포함",
};

/** 식재료비를 세액 포함(공급가액+세액) 또는 미포함(공급가액만) 기준으로 계산한다. */
export function materialCostFor(cost: MaterialCost, mode: TaxMode): number {
  return mode === "INCLUDED" ? cost.supply + cost.tax : cost.supply;
}

/** 입력칸 문자열을 0 이상의 정수로 바꾼다. 숫자가 아니면 0. */
export function parseWholeNumber(text: string): number {
  const digits = text.replace(/\D/g, "");
  if (!digits) return 0;
  const n = Number(digits);
  return Number.isSafeInteger(n) ? n : 0;
}

/** 브라우저에 저장해 둔 단가 문자열을 검증한다. 단가 3개(숫자)가 아니면 null. */
export function parseSavedPrices(raw: string | null, expectedCount = 3): string[] | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== expectedCount) return null;
    if (!parsed.every((v) => typeof v === "string" && /^\d+$/.test(v))) return null;
    return parsed as string[];
  } catch {
    return null;
  }
}

/** 식당 매출 = Σ(단가 × 인원). 단가와 인원은 같은 순서의 문자열 입력값이다. */
export function computeRevenue(prices: string[], counts: string[]): number {
  return prices.reduce((sum, price, i) => sum + parseWholeNumber(price) * parseWholeNumber(counts[i] ?? ""), 0);
}

export function computeProfit(revenue: number, materialCost: number): number {
  return revenue - materialCost;
}
