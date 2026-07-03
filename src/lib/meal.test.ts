import { describe, it, expect } from "vitest";
import { determineMealType } from "./meal";

function kstDate(hour: number, minute: number): Date {
  // KST = UTC+9, so subtract 9 hours to get the equivalent UTC instant.
  return new Date(Date.UTC(2026, 6, 4, hour - 9, minute));
}

describe("determineMealType", () => {
  it("중식 시작 시각(11:00)은 LUNCH", () => {
    expect(determineMealType(kstDate(11, 0))).toBe("LUNCH");
  });

  it("중식 종료 시각(13:30)은 LUNCH", () => {
    expect(determineMealType(kstDate(13, 30))).toBe("LUNCH");
  });

  it("중식 시간 중간(12:00)은 LUNCH", () => {
    expect(determineMealType(kstDate(12, 0))).toBe("LUNCH");
  });

  it("석식 시작 시각(17:00)은 DINNER", () => {
    expect(determineMealType(kstDate(17, 0))).toBe("DINNER");
  });

  it("석식 종료 시각(19:30)은 DINNER", () => {
    expect(determineMealType(kstDate(19, 30))).toBe("DINNER");
  });

  it("중식 시작 1분 전(10:59)은 null", () => {
    expect(determineMealType(kstDate(10, 59))).toBeNull();
  });

  it("중식 종료 1분 후(13:31)은 null", () => {
    expect(determineMealType(kstDate(13, 31))).toBeNull();
  });

  it("석식 시작 1분 전(16:59)은 null", () => {
    expect(determineMealType(kstDate(16, 59))).toBeNull();
  });

  it("석식 종료 1분 후(19:31)은 null", () => {
    expect(determineMealType(kstDate(19, 31))).toBeNull();
  });

  it("자정(00:00)은 null", () => {
    expect(determineMealType(kstDate(0, 0))).toBeNull();
  });
});
