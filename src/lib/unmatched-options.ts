export type UnmatchedOptionRow = {
  itemName: string;
  unit: string;
  unitPrice: number;
  vendorName: string;
};

/** 같은 업체·품명·규격·단가로 여러 번 입력된 미등록 품목은 자동완성에 한 번만 보여준다(입력 순서는 유지). */
export function dedupeUnmatchedItems(rows: UnmatchedOptionRow[]): UnmatchedOptionRow[] {
  const seen = new Set<string>();
  const result: UnmatchedOptionRow[] = [];
  for (const row of rows) {
    const key = [row.vendorName, row.itemName, row.unit, row.unitPrice].join("\u0000");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(row);
  }
  return result;
}
