import { describe, expect, it } from "vitest";
import { dedupeUnmatchedItems } from "./unmatched-options";

describe("dedupeUnmatchedItems", () => {
  it("업체·품명·규격·단가가 모두 같은 항목은 한 번만 남기고 순서를 유지한다", () => {
    const result = dedupeUnmatchedItems([
      { itemName: "참깨", unit: "kg", unitPrice: 9410, vendorName: "경북유통" },
      { itemName: "들깨", unit: "kg", unitPrice: 8000, vendorName: "경북유통" },
      { itemName: "참깨", unit: "kg", unitPrice: 9410, vendorName: "경북유통" },
    ]);
    expect(result.map((r) => r.itemName)).toEqual(["참깨", "들깨"]);
  });

  it("단가나 업체가 다르면 별개 항목으로 둔다", () => {
    const result = dedupeUnmatchedItems([
      { itemName: "참깨", unit: "kg", unitPrice: 9410, vendorName: "경북유통" },
      { itemName: "참깨", unit: "kg", unitPrice: 9800, vendorName: "경북유통" },
      { itemName: "참깨", unit: "kg", unitPrice: 9410, vendorName: "세림글로벌" },
    ]);
    expect(result).toHaveLength(3);
  });
});
