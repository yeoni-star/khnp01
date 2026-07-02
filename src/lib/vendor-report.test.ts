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
      quantity: 2,
      unitPrice: 46200,
      amount: 92400,
    },
    {
      deliveryDate: new Date("2026-05-18T00:00:00.000Z"),
      itemName: "식용유",
      category: "PROCESSED" as const,
      unit: "말",
      quantity: 3,
      unitPrice: 46200,
      amount: 138600,
    },
    {
      deliveryDate: new Date("2026-05-18T00:00:00.000Z"),
      itemName: "참기름",
      category: "PROCESSED" as const,
      unit: "ea",
      quantity: 1,
      unitPrice: 23100,
      amount: 23100,
    },
  ];

  it("품목별 수량/금액을 합산하고 가중평균 단가를 계산한다", () => {
    const report = aggregateVendorReport(rows);
    const oil = report.items.find((i) => i.itemName === "식용유")!;
    expect(oil.totalQuantity).toBe(5);
    expect(oil.totalAmount).toBe(231000);
    expect(oil.unitPrice).toBe(46200);
    expect(oil.priceVaries).toBe(false);
  });

  it("날짜별 수량 매트릭스를 올바르게 채운다", () => {
    const report = aggregateVendorReport(rows);
    const oil = report.items.find((i) => i.itemName === "식용유")!;
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
        quantity: 1,
        unitPrice: 47000,
        amount: 47000,
      },
    ];
    const report = aggregateVendorReport(varyingRows);
    const oil = report.items.find((i) => i.itemName === "식용유")!;
    expect(oil.priceVaries).toBe(true);
  });

  it("전체 합계 금액을 계산한다", () => {
    const report = aggregateVendorReport(rows);
    expect(report.grandTotal).toBe(92400 + 138600 + 23100);
  });
});
