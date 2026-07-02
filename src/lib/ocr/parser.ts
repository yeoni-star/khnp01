import type { OcrItem, OcrResult } from "./schema";

const UNIT_PATTERN = /^(kg|g|ml|l|ea|box|말|포|병|캔|팩|줄|단|모|쪽|개|장|통|봉|묶음)$/i;
const NUMBER_PATTERN = /^[₩]?[\d][\d,]*(\.\d+)?원?$/;

function isNumberToken(token: string): boolean {
  return NUMBER_PATTERN.test(token);
}

function parseNumber(token: string): number {
  return Number(token.replace(/[₩,원]/g, ""));
}

/** 한 줄의 텍스트를 품목명/수량/단위/단가/금액으로 휴리스틱하게 분리한다. */
export function parseLine(text: string): OcrItem | null {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;

  const numberIndexes: number[] = [];
  tokens.forEach((t, i) => {
    if (isNumberToken(t)) numberIndexes.push(i);
  });
  // 숫자가 2개 미만이면 품목 행이 아닌 것(표 제목, 안내문 등)으로 판단
  if (numberIndexes.length < 2) return null;

  const usedCount = Math.min(3, numberIndexes.length);
  const usedIndexes = numberIndexes.slice(-usedCount);
  const numbers = usedIndexes.map((i) => parseNumber(tokens[i]));

  let quantity: number | null = null;
  let unitPrice: number | null = null;
  let amount: number | null = null;
  if (usedCount === 2) {
    [quantity, unitPrice] = numbers;
    amount = quantity !== null && unitPrice !== null ? Math.round(quantity * unitPrice) : null;
  } else {
    [quantity, unitPrice, amount] = numbers;
  }

  const nameTokens: string[] = [];
  let unit: string | null = null;
  tokens.forEach((t, i) => {
    if (usedIndexes.includes(i)) return;
    if (isNumberToken(t)) return; // 번호 열 등 사용하지 않는 숫자는 건너뜀
    if (unit === null && UNIT_PATTERN.test(t)) {
      unit = t;
      return;
    }
    nameTokens.push(t);
  });

  const itemName = nameTokens.join(" ").trim();
  if (!itemName) return null;

  return { itemName, quantity, unit, unitPrice, amount };
}

export function guessDeliveryDate(fullText: string): string | null {
  const match = fullText.match(/(\d{2,4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (!match) return null;
  const [, yRaw, mRaw, dRaw] = match;
  const year = yRaw.length === 2 ? `20${yRaw}` : yRaw;
  return `${year}-${mRaw.padStart(2, "0")}-${dRaw.padStart(2, "0")}`;
}

export function guessVendorName(fullText: string): string | null {
  const match = fullText.match(/(?:업체명|상호|공급자)\s*[:：]?\s*(\S+)/);
  return match ? match[1].trim() : null;
}
