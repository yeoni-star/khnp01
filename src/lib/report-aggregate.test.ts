import { describe, it, expect } from "vitest";
import { aggregateSummaryReport } from "./report-aggregate";

describe("aggregateSummaryReport", () => {
  const rows = [
    { category: "PROCESSED" as const, itemName: "식용유", unit: "말", quantity: 2, unitPrice: 46200, amount: 92400 },
    { category: "PROCESSED" as const, itemName: "참기름", unit: "ea", quantity: 1, unitPrice: 23100, amount: 23100 },
    { category: "MEAT" as const, itemName: "돼지고기", unit: "kg", quantity: 5, unitPrice: 12000, amount: 60000 },
  ];

  it("카테고리 고정 순서(양곡→김치류→농수산물→공산품→육류)로 섹션을 만든다", () => {
    const report = aggregateSummaryReport(rows);
    expect(report.sections.map((s) => s.category)).toEqual(["PROCESSED", "MEAT"]);
  });

  it("품목이 없는 카테고리는 섹션에서 제외한다", () => {
    const report = aggregateSummaryReport(rows);
    expect(report.sections.find((s) => s.category === "GRAIN")).toBeUndefined();
  });

  it("카테고리 소계와 전체 합계를 올바르게 계산한다", () => {
    const report = aggregateSummaryReport(rows);
    const processed = report.sections.find((s) => s.category === "PROCESSED")!;
    expect(processed.subtotal).toBe(92400 + 23100);
    expect(report.grandTotal).toBe(92400 + 23100 + 60000);
  });

  it("같은 품목이 여러 단가로 섞이면 priceVaries=true, 가중평균 단가를 계산한다", () => {
    const mixedRows = [
      { category: "GRAIN" as const, itemName: "쌀", unit: "kg", quantity: 10, unitPrice: 2000, amount: 20000 },
      { category: "GRAIN" as const, itemName: "쌀", unit: "kg", quantity: 10, unitPrice: 2200, amount: 22000 },
    ];
    const report = aggregateSummaryReport(mixedRows);
    const rice = report.sections[0].items[0];
    expect(rice.priceVaries).toBe(true);
    expect(rice.unitPrice).toBe(Math.round(42000 / 20));
  });
});
