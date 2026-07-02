import { describe, it, expect } from "vitest";
import { aggregateQuantity } from "./quantity-aggregate";

describe("aggregateQuantity", () => {
  it("단가 없이 품목+단위별 수량만 합산한다", () => {
    const rows = [
      { itemName: "식용유", category: "PROCESSED" as const, unit: "말", quantity: 2 },
      { itemName: "식용유", category: "PROCESSED" as const, unit: "말", quantity: 3 },
      { itemName: "참기름", category: "PROCESSED" as const, unit: "ea", quantity: 1 },
    ];
    const result = aggregateQuantity(rows);
    expect(result.find((r) => r.itemName === "식용유")?.totalQuantity).toBe(5);
    expect(result.find((r) => r.itemName === "참기름")?.totalQuantity).toBe(1);
    expect(Object.keys(result[0])).not.toContain("unitPrice");
  });

  it("단위가 다르면 별도 행으로 취급한다", () => {
    const rows = [
      { itemName: "설탕", category: "PROCESSED" as const, unit: "kg", quantity: 5 },
      { itemName: "설탕", category: "PROCESSED" as const, unit: "포", quantity: 2 },
    ];
    const result = aggregateQuantity(rows);
    expect(result).toHaveLength(2);
  });
});
