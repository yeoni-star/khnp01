import { describe, it, expect } from "vitest";
import { aggregateQuantity } from "./quantity-aggregate";

describe("aggregateQuantity", () => {
  it("단가 없이 품목+단위+세금유형+식당별 수량만 합산한다", () => {
    const rows = [
      { itemName: "식용유", category: "PROCESSED" as const, unit: "말", taxType: "TAXABLE" as const, restaurant: "A" as const, quantity: 2 },
      { itemName: "식용유", category: "PROCESSED" as const, unit: "말", taxType: "TAXABLE" as const, restaurant: "A" as const, quantity: 3 },
      { itemName: "참기름", category: "PROCESSED" as const, unit: "ea", taxType: "TAXABLE" as const, restaurant: "A" as const, quantity: 1 },
    ];
    const result = aggregateQuantity(rows);
    expect(result.find((r) => r.itemName === "식용유")?.totalQuantity).toBe(5);
    expect(result.find((r) => r.itemName === "참기름")?.totalQuantity).toBe(1);
    expect(Object.keys(result[0])).not.toContain("unitPrice");
  });

  it("단위가 다르면 별도 행으로 취급한다", () => {
    const rows = [
      { itemName: "설탕", category: "PROCESSED" as const, unit: "kg", taxType: "TAXABLE" as const, restaurant: "A" as const, quantity: 5 },
      { itemName: "설탕", category: "PROCESSED" as const, unit: "포", taxType: "TAXABLE" as const, restaurant: "A" as const, quantity: 2 },
    ];
    const result = aggregateQuantity(rows);
    expect(result).toHaveLength(2);
  });

  it("같은 품목명+단위라도 세금유형이 다르면 별도 행으로 취급한다", () => {
    const rows = [
      { itemName: "포기김치", category: "KIMCHI" as const, unit: "kg", taxType: "TAXABLE" as const, restaurant: "A" as const, quantity: 10 },
      { itemName: "포기김치", category: "KIMCHI" as const, unit: "kg", taxType: "EXEMPT" as const, restaurant: "A" as const, quantity: 20 },
    ];
    const result = aggregateQuantity(rows);
    expect(result).toHaveLength(2);
    expect(result.find((r) => r.taxType === "TAXABLE")?.totalQuantity).toBe(10);
    expect(result.find((r) => r.taxType === "EXEMPT")?.totalQuantity).toBe(20);
  });

  it("같은 품목명+단위+세금유형이라도 식당이 다르면 별도 행으로 취급한다", () => {
    const rows = [
      { itemName: "쌀", category: "GRAIN" as const, unit: "kg", taxType: "TAXABLE" as const, restaurant: "A" as const, quantity: 100 },
      { itemName: "쌀", category: "GRAIN" as const, unit: "kg", taxType: "TAXABLE" as const, restaurant: "B" as const, quantity: 50 },
    ];
    const result = aggregateQuantity(rows);
    expect(result).toHaveLength(2);
    expect(result.find((r) => r.restaurant === "A")?.totalQuantity).toBe(100);
    expect(result.find((r) => r.restaurant === "B")?.totalQuantity).toBe(50);
  });
});
