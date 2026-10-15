import { describe, expect, it } from "vitest";
import { computeProfit, computeRevenue, materialCostFor, parseSavedPrices, parseWholeNumber } from "./profit-calc";

describe("parseWholeNumber", () => {
  it("숫자만 남겨 정수로 바꾼다", () => {
    expect(parseWholeNumber("1,250")).toBe(1250);
    expect(parseWholeNumber("  42 ")).toBe(42);
  });

  it("비어 있거나 숫자가 없으면 0이다", () => {
    expect(parseWholeNumber("")).toBe(0);
    expect(parseWholeNumber("abc")).toBe(0);
  });
});

describe("computeRevenue", () => {
  it("(단가 × 인원)의 합으로 매출을 계산한다", () => {
    expect(computeRevenue(["4000", "4500", "5600"], ["10", "20", "30"])).toBe(4000 * 10 + 4500 * 20 + 5600 * 30);
  });

  it("인원이 비어 있는 항목은 0원으로 본다", () => {
    expect(computeRevenue(["4000", "4500", "5600"], ["10", "", "30"])).toBe(4000 * 10 + 5600 * 30);
  });

  it("단가를 바꾸면 바뀐 단가로 계산한다", () => {
    expect(computeRevenue(["5000", "4500", "5600"], ["10", "0", "0"])).toBe(50000);
  });
});

describe("materialCostFor", () => {
  const cost = { supply: 1_000_000, tax: 80_000 };

  it("세액 포함이면 공급가액과 세액을 더한다", () => {
    expect(materialCostFor(cost, "INCLUDED")).toBe(1_080_000);
  });

  it("세액 미포함이면 공급가액만 쓴다", () => {
    expect(materialCostFor(cost, "EXCLUDED")).toBe(1_000_000);
  });
});

describe("computeProfit", () => {
  it("매출에서 식재료비를 뺀다", () => {
    expect(computeProfit(1_500_000, 1_080_000)).toBe(420_000);
  });

  it("식재료비가 더 크면 음수(손실)가 된다", () => {
    expect(computeProfit(500_000, 800_000)).toBe(-300_000);
  });
});

describe("parseSavedPrices", () => {
  it("숫자 문자열 3개 배열이면 그대로 돌려준다", () => {
    expect(parseSavedPrices('["4000","4500","5600"]')).toEqual(["4000", "4500", "5600"]);
  });

  it("저장된 값이 없거나 깨져 있으면 null이다", () => {
    expect(parseSavedPrices(null)).toBeNull();
    expect(parseSavedPrices("")).toBeNull();
    expect(parseSavedPrices("not json")).toBeNull();
  });

  it("개수가 다르거나 숫자가 아닌 값이 섞여 있으면 null이다", () => {
    expect(parseSavedPrices('["4000","4500"]')).toBeNull();
    expect(parseSavedPrices('["4000","abc","5600"]')).toBeNull();
    expect(parseSavedPrices("[4000,4500,5600]")).toBeNull();
    expect(parseSavedPrices('{"a":1}')).toBeNull();
  });
});
