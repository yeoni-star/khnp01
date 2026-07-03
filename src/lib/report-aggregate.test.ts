import { describe, it, expect } from "vitest";
import { aggregateSummaryReport } from "./report-aggregate";

describe("aggregateSummaryReport", () => {
  const rows = [
    {
      category: "PROCESSED" as const,
      itemName: "식용유",
      unit: "말",
      taxType: "TAXABLE" as const,
      quantity: 2,
      unitPrice: 46200,
      amount: 92400,
      taxAmount: 9240,
    },
    {
      category: "PROCESSED" as const,
      itemName: "참기름",
      unit: "ea",
      taxType: "TAXABLE" as const,
      quantity: 1,
      unitPrice: 23100,
      amount: 23100,
      taxAmount: 2310,
    },
    {
      category: "MEAT" as const,
      itemName: "돼지고기",
      unit: "kg",
      taxType: "TAXABLE" as const,
      quantity: 5,
      unitPrice: 12000,
      amount: 60000,
      taxAmount: 6000,
    },
  ];

  it("과세 섹션 안에서 카테고리 고정 순서(양곡→김치류→농수산물→육류→공산품)로 묶는다", () => {
    const report = aggregateSummaryReport(rows);
    const taxable = report.taxSections.find((s) => s.taxType === "TAXABLE")!;
    expect(taxable.categories.map((c) => c.category)).toEqual(["MEAT", "PROCESSED"]);
  });

  it("품목이 없는 카테고리는 섹션에서 제외한다", () => {
    const report = aggregateSummaryReport(rows);
    const taxable = report.taxSections.find((s) => s.taxType === "TAXABLE")!;
    expect(taxable.categories.find((c) => c.category === "GRAIN")).toBeUndefined();
  });

  it("카테고리 소계, 세액 소계, 전체 합계(공급가액+세액)를 올바르게 계산한다", () => {
    const report = aggregateSummaryReport(rows);
    const taxable = report.taxSections.find((s) => s.taxType === "TAXABLE")!;
    const processed = taxable.categories.find((c) => c.category === "PROCESSED")!;
    expect(processed.subtotal).toBe(92400 + 23100);
    expect(taxable.supplySubtotal).toBe(92400 + 23100 + 60000);
    expect(taxable.taxSubtotal).toBe(9240 + 2310 + 6000);
    expect(report.taxableSupplyTotal).toBe(92400 + 23100 + 60000);
    expect(report.taxableTaxTotal).toBe(9240 + 2310 + 6000);
    expect(report.exemptSupplyTotal).toBe(0);
    expect(report.grandTotal).toBe(report.taxableSupplyTotal + report.taxableTaxTotal + report.exemptSupplyTotal);
  });

  it("과세/면세를 별도 섹션으로 나누고, 면세는 세액이 0이다", () => {
    const mixedRows = [
      ...rows,
      {
        category: "GRAIN" as const,
        itemName: "쌀",
        unit: "kg",
        taxType: "EXEMPT" as const,
        quantity: 20,
        unitPrice: 2000,
        amount: 40000,
        taxAmount: null,
      },
    ];
    const report = aggregateSummaryReport(mixedRows);
    expect(report.taxSections.map((s) => s.taxType)).toEqual(["TAXABLE", "EXEMPT"]);
    const exempt = report.taxSections.find((s) => s.taxType === "EXEMPT")!;
    expect(exempt.supplySubtotal).toBe(40000);
    expect(exempt.taxSubtotal).toBe(0);
    expect(report.exemptSupplyTotal).toBe(40000);
    expect(report.grandTotal).toBe(report.taxableSupplyTotal + report.taxableTaxTotal + 40000);
  });

  it("같은 품목이 여러 단가로 섞이면 priceVaries=true, 가중평균 단가를 계산한다", () => {
    const mixedRows = [
      {
        category: "GRAIN" as const,
        itemName: "쌀",
        unit: "kg",
        taxType: "TAXABLE" as const,
        quantity: 10,
        unitPrice: 2000,
        amount: 20000,
        taxAmount: 2000,
      },
      {
        category: "GRAIN" as const,
        itemName: "쌀",
        unit: "kg",
        taxType: "TAXABLE" as const,
        quantity: 10,
        unitPrice: 2200,
        amount: 22000,
        taxAmount: 2200,
      },
    ];
    const report = aggregateSummaryReport(mixedRows);
    const taxable = report.taxSections.find((s) => s.taxType === "TAXABLE")!;
    const rice = taxable.categories[0].items[0];
    expect(rice.priceVaries).toBe(true);
    expect(rice.unitPrice).toBe(Math.round(42000 / 20));
  });
});
