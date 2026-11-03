import { describe, expect, it } from "vitest";
import { computeLineTaxAmount, computeTaxAmount } from "./tax";

describe("computeLineTaxAmount", () => {
  it("계약 단가표에 세액이 입력된 품목은 단위 세액 × 수량을 쓴다", () => {
    // 단가 3,327원, 계약 단가표 세액 332원(자동 계산은 333원)
    expect(
      computeLineTaxAmount({ quantity: 3, unitPrice: 3327, contractItem: { unitPrice: 3327, taxAmount: 332 } })
    ).toBe(996);
    expect(computeTaxAmount(3 * 3327)).toBe(998);
  });

  it("세액 0원으로 입력한 경우도 입력값을 존중한다", () => {
    expect(computeLineTaxAmount({ quantity: 5, unitPrice: 1000, contractItem: { unitPrice: 1000, taxAmount: 0 } })).toBe(0);
  });

  it("계약에 세액이 없으면(null/undefined) 금액의 10%로 계산한다", () => {
    expect(computeLineTaxAmount({ quantity: 2, unitPrice: 1000, contractItem: { unitPrice: 1000, taxAmount: null } })).toBe(200);
    expect(computeLineTaxAmount({ quantity: 2, unitPrice: 1000, contractItem: { unitPrice: 1000 } })).toBe(200);
  });

  it("계약 품목이 아니면(미등록) 금액의 10%로 계산한다", () => {
    expect(computeLineTaxAmount({ quantity: 4, unitPrice: 2500 })).toBe(1000);
    expect(computeLineTaxAmount({ quantity: 4, unitPrice: 2500, contractItem: null })).toBe(1000);
  });

  it("단가를 계약과 다르게 바꾸면 입력된 세액을 쓰지 않고 금액의 10%로 계산한다", () => {
    expect(
      computeLineTaxAmount({ quantity: 2, unitPrice: 1200, contractItem: { unitPrice: 1000, taxAmount: 90 } })
    ).toBe(240);
  });

  it("소수 수량은 세액 합계를 반올림한다", () => {
    expect(
      computeLineTaxAmount({ quantity: 1.5, unitPrice: 1000, contractItem: { unitPrice: 1000, taxAmount: 101 } })
    ).toBe(152);
  });
});
