import { describe, expect, it } from "vitest";

// db 모듈은 import 시 환경변수를 요구하므로, 순수 집계 함수만 테스트하기 위해 목으로 대체한다.
import { vi } from "vitest";
vi.mock("./db", () => ({ db: {} }));

import { aggregateMonthlyMaterialCost } from "./monthly-material-cost";

describe("aggregateMonthlyMaterialCost", () => {
  it("식당별로 공급가액과 세액을 따로 합산한다", () => {
    const result = aggregateMonthlyMaterialCost([
      { restaurant: "A", amount: 100_000, taxAmount: 10_000 },
      { restaurant: "A", amount: 50_000, taxAmount: 5_000 },
      { restaurant: "B", amount: 30_000, taxAmount: 3_000 },
    ]);
    expect(result.A).toEqual({ supply: 150_000, tax: 15_000 });
    expect(result.B).toEqual({ supply: 30_000, tax: 3_000 });
  });

  it("면세 품목(세액 null)은 세액 0으로 합산한다", () => {
    const result = aggregateMonthlyMaterialCost([
      { restaurant: "A", amount: 80_000, taxAmount: null },
      { restaurant: "A", amount: 20_000, taxAmount: 2_000 },
    ]);
    expect(result.A).toEqual({ supply: 100_000, tax: 2_000 });
  });

  it("데이터가 없는 식당도 0원으로 반환한다", () => {
    const result = aggregateMonthlyMaterialCost([]);
    expect(result.A).toEqual({ supply: 0, tax: 0 });
    expect(result.B).toEqual({ supply: 0, tax: 0 });
  });
});
