import { describe, expect, it } from "vitest";
import { isCompleteDigitDate, parseDateInput, sanitizeDateInput } from "./date-input";

const NOW = new Date(2026, 9, 16);

describe("parseDateInput", () => {
  it("숫자 8자리는 YYYYMMDD로 해석한다", () => {
    expect(parseDateInput("20260929", NOW)).toBe("2026-09-29");
  });

  it("숫자 6자리는 YYMMDD로 해석한다", () => {
    expect(parseDateInput("260929", NOW)).toBe("2026-09-29");
  });

  it("숫자 4자리는 올해의 MMDD로 해석한다", () => {
    expect(parseDateInput("0929", NOW)).toBe("2026-09-29");
  });

  it("구분자가 있는 입력도 해석한다", () => {
    expect(parseDateInput("26.7.17", NOW)).toBe("2026-07-17");
    expect(parseDateInput("2026-9-3", NOW)).toBe("2026-09-03");
    expect(parseDateInput("9/29", NOW)).toBe("2026-09-29");
  });

  it("존재하지 않는 날짜는 null이다", () => {
    expect(parseDateInput("20261340", NOW)).toBeNull();
    expect(parseDateInput("0230", NOW)).toBeNull();
    expect(parseDateInput("20260931", NOW)).toBeNull();
  });

  it("윤년 2월 29일은 허용한다", () => {
    expect(parseDateInput("20240229", NOW)).toBe("2024-02-29");
    expect(parseDateInput("20260229", NOW)).toBeNull();
  });

  it("자릿수가 맞지 않거나 비어 있으면 null이다", () => {
    expect(parseDateInput("", NOW)).toBeNull();
    expect(parseDateInput("   ", NOW)).toBeNull();
    expect(parseDateInput("2026092", NOW)).toBeNull();
    expect(parseDateInput("12", NOW)).toBeNull();
  });
});

describe("sanitizeDateInput", () => {
  it("숫자와 구분자만 남긴다", () => {
    expect(sanitizeDateInput("2026a-09 29")).toBe("2026-0929");
  });
});

describe("isCompleteDigitDate", () => {
  it("숫자 8자리일 때만 true다", () => {
    expect(isCompleteDigitDate("20260929")).toBe(true);
    expect(isCompleteDigitDate("260929")).toBe(false);
    expect(isCompleteDigitDate("2026-09-29")).toBe(false);
  });
});
