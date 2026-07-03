import { describe, it, expect } from "vitest";
import { groupDatesIntoWeeks, aggregateVendorReport } from "./vendor-report";

describe("groupDatesIntoWeeks", () => {
  it("실제 샘플 날짜(2026년 5월)를 월~일 기준으로, 등장 순서대로 1주/2주/3주로 묶는다", () => {
    const dates = ["2026-05-11", "2026-05-13", "2026-05-18", "2026-05-20", "2026-05-22", "2026-05-26", "2026-05-27", "2026-05-28"];
    const weeks = groupDatesIntoWeeks(dates);
    expect(weeks.map((w) => w.label)).toEqual(["1주", "2주", "3주"]);
    expect(weeks[0].dates).toEqual(["2026-05-11", "2026-05-13"]);
    expect(weeks[1].dates).toEqual(["2026-05-18", "2026-05-20", "2026-05-22"]);
    expect(weeks[2].dates).toEqual(["2026-05-26", "2026-05-27", "2026-05-28"]);
  });

  it("빈 배열이면 빈 결과", () => {
    expect(groupDatesIntoWeeks([])).toEqual([]);
  });
});

describe("aggregateVendorReport", () => {
  const rows = [
    {
      deliveryDate: new Date("2026-05-11T00:00:00.000Z"),
      itemName: "식용유",
      category: "PROCESSED" as const,
      unit: "말",
      taxType: "TAXABLE" as const,
      quantity: 2,
      unitPrice: 46200,
      amount: 92400,
      taxAmount: 9240,
    },
    {
      deliveryDate: new Date("2026-05-18T00:00:00.000Z"),
      itemName: "식용유",
      category: "PROCESSED" as const,
      unit: "말",
      taxType: "TAXABLE" as const,
      quantity: 3,
      unitPrice: 46200,
      amount: 138600,
      taxAmount: 13860,
    },
    {
      deliveryDate: new Date("2026-05-18T00:00:00.000Z"),
      itemName: "참기름",
      category: "PROCESSED" as const,
      unit: "ea",
      taxType: "TAXABLE" as const,
      quantity: 1,
      unitPrice: 23100,
      amount: 23100,
      taxAmount: 2310,
    },
  ];

  it("품목별 수량/금액/세액을 합산하고 가중평균 단가를 계산한다", () => {
    const report = aggregateVendorReport(rows);
    const oil = report.taxableItems.find((i) => i.itemName === "식용유")!;
    expect(oil.totalQuantity).toBe(5);
    expect(oil.totalAmount).toBe(231000);
    expect(oil.totalTaxAmount).toBe(9240 + 13860);
    expect(oil.unitPrice).toBe(46200);
    expect(oil.priceVaries).toBe(false);
  });

  it("날짜별 수량 매트릭스를 올바르게 채운다", () => {
    const report = aggregateVendorReport(rows);
    const oil = report.taxableItems.find((i) => i.itemName === "식용유")!;
    expect(oil.quantityByDate["2026-05-11"]).toBe(2);
    expect(oil.quantityByDate["2026-05-18"]).toBe(3);
  });

  it("같은 품목이 기간 내 다른 단가로 납품되면 priceVaries=true", () => {
    const varyingRows = [
      ...rows,
      {
        deliveryDate: new Date("2026-05-26T00:00:00.000Z"),
        itemName: "식용유",
        category: "PROCESSED" as const,
        unit: "말",
        taxType: "TAXABLE" as const,
        quantity: 1,
        unitPrice: 47000,
        amount: 47000,
        taxAmount: 4700,
      },
    ];
    const report = aggregateVendorReport(varyingRows);
    const oil = report.taxableItems.find((i) => i.itemName === "식용유")!;
    expect(oil.priceVaries).toBe(true);
  });

  it("공급가액 합계, 세액 합계, 총 합계(공급가액+세액)를 계산한다", () => {
    const report = aggregateVendorReport(rows);
    expect(report.taxableSupplyTotal).toBe(92400 + 138600 + 23100);
    expect(report.taxableTaxTotal).toBe(9240 + 13860 + 2310);
    expect(report.exemptSupplyTotal).toBe(0);
    expect(report.grandTotal).toBe(report.taxableSupplyTotal + report.taxableTaxTotal);
  });

  it("과세와 면세 품목을 별도 목록으로 나누고, 같은 품목명이라도 세금유형이 다르면 다른 행이 된다", () => {
    const mixedRows = [
      ...rows,
      {
        deliveryDate: new Date("2026-05-20T00:00:00.000Z"),
        itemName: "식용유",
        category: "PROCESSED" as const,
        unit: "말",
        taxType: "EXEMPT" as const,
        quantity: 1,
        unitPrice: 46200,
        amount: 46200,
        taxAmount: null,
      },
    ];
    const report = aggregateVendorReport(mixedRows);
    expect(report.taxableItems.some((i) => i.itemName === "식용유")).toBe(true);
    expect(report.exemptItems.some((i) => i.itemName === "식용유")).toBe(true);
    const exemptOil = report.exemptItems.find((i) => i.itemName === "식용유")!;
    expect(exemptOil.totalAmount).toBe(46200);
    expect(exemptOil.totalTaxAmount).toBe(0);
    expect(report.exemptSupplyTotal).toBe(46200);
    expect(report.grandTotal).toBe(report.taxableSupplyTotal + report.taxableTaxTotal + 46200);
  });
});
