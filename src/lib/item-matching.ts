// 낮은 편의 임계값: 최종 확정은 항상 사람이 예/아니오로 결정하므로,
// 놓치는 것(false negative)보다 과하게 제안하는 것(false positive)이 낫다.
export const SIMILARITY_THRESHOLD = 0.35;

function bigrams(value: string): string[] {
  const clean = value.trim().toLowerCase();
  if (clean.length < 2) return clean ? [clean] : [];
  const result: string[] = [];
  for (let i = 0; i < clean.length - 1; i++) {
    result.push(clean.slice(i, i + 2));
  }
  return result;
}

/** Dice coefficient (bigram 기반 문자열 유사도, 0~1). 한글에도 잘 동작함. */
export function diceCoefficient(a: string, b: string): number {
  const bigramsA = bigrams(a);
  const bigramsB = bigrams(b);
  if (bigramsA.length === 0 || bigramsB.length === 0) return 0;

  const remaining = new Map<string, number>();
  for (const bg of bigramsB) {
    remaining.set(bg, (remaining.get(bg) ?? 0) + 1);
  }

  let matches = 0;
  for (const bg of bigramsA) {
    const count = remaining.get(bg) ?? 0;
    if (count > 0) {
      matches += 1;
      remaining.set(bg, count - 1);
    }
  }

  return (2 * matches) / (bigramsA.length + bigramsB.length);
}

/**
 * 정확히 일치하지 않는 품목명에 대해, 후보 목록 중 가장 유사한 항목을 찾는다.
 * 정확 일치 항목은 호출하는 쪽(findActiveContractItem)에서 먼저 처리하고,
 * 이 함수는 "혹시 이 품목 아닌가요?" 제안용으로만 사용한다.
 */
export function findSimilarItem<T extends { itemName: string }>(
  itemName: string,
  candidates: T[],
  threshold: number = SIMILARITY_THRESHOLD
): { item: T; score: number } | null {
  const normalized = itemName.trim().toLowerCase();
  if (!normalized) return null;

  let best: { item: T; score: number } | null = null;
  for (const candidate of candidates) {
    const candidateName = candidate.itemName.trim().toLowerCase();
    if (candidateName === normalized) continue;
    
    let score = diceCoefficient(normalized, candidate.itemName);
    
    if (candidateName.includes(normalized) || normalized.includes(candidateName)) {
      score = Math.max(score, 0.8);
    }

    if (score >= threshold && (!best || score > best.score)) {
      best = { item: candidate, score };
    }
  }
  return best;
}
