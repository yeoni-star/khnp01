import { describe, it, expect } from "vitest";
import { diceCoefficient, findSimilarItem } from "./item-matching";

describe("diceCoefficient", () => {
  it("동일 문자열은 1", () => {
    expect(diceCoefficient("식용유", "식용유")).toBe(1);
  });

  it("전혀 다른 문자열은 낮은 점수", () => {
    expect(diceCoefficient("식용유", "당면")).toBeLessThan(0.3);
  });

  it("표기 차이가 있어도 임계값 이상의 점수를 준다", () => {
    expect(diceCoefficient("진간장", "진간장(1.8L)")).toBeGreaterThanOrEqual(0.35);
  });
});

describe("findSimilarItem", () => {
  const candidates = [{ itemName: "진간장" }, { itemName: "국간장" }, { itemName: "식용유" }];

  it("유사한 후보를 찾는다", () => {
    const result = findSimilarItem("진간장(병)", candidates);
    expect(result?.item.itemName).toBe("진간장");
  });

  it("정확히 일치하는 항목은 제외한다 (exact match는 별도 로직에서 처리)", () => {
    const result = findSimilarItem("진간장", candidates);
    expect(result?.item.itemName).not.toBe("진간장");
  });

  it("유사한 후보가 없으면 null", () => {
    const result = findSimilarItem("전혀다른품목명123", candidates);
    expect(result).toBeNull();
  });
});
