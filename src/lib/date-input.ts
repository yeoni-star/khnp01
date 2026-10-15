function isValidYmd(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1) return false;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return d <= lastDay;
}

function toIso(y: number, m: number, d: number): string | null {
  if (!isValidYmd(y, m, d)) return null;
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function expandYear(y: number, rawLength: number): number {
  return rawLength <= 2 ? 2000 + y : y;
}

/**
 * 사람이 직접 입력한 날짜 문자열을 YYYY-MM-DD로 바꾼다. 해석할 수 없으면 null.
 * - 숫자만: 8자리 YYYYMMDD / 6자리 YYMMDD / 4자리 MMDD(올해로 간주)
 * - 구분자(-, ., /) 포함: 2026-9-29, 26.9.29, 9/29 등
 */
export function parseDateInput(text: string, now: Date = new Date()): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const currentYear = now.getFullYear();

  if (/\D/.test(trimmed)) {
    const parts = trimmed.split(/\D+/).filter(Boolean);
    if (parts.length === 3) {
      return toIso(expandYear(Number(parts[0]), parts[0].length), Number(parts[1]), Number(parts[2]));
    }
    if (parts.length === 2) {
      return toIso(currentYear, Number(parts[0]), Number(parts[1]));
    }
    return null;
  }

  if (trimmed.length === 8) {
    return toIso(Number(trimmed.slice(0, 4)), Number(trimmed.slice(4, 6)), Number(trimmed.slice(6, 8)));
  }
  if (trimmed.length === 6) {
    return toIso(2000 + Number(trimmed.slice(0, 2)), Number(trimmed.slice(2, 4)), Number(trimmed.slice(4, 6)));
  }
  if (trimmed.length === 4) {
    return toIso(currentYear, Number(trimmed.slice(0, 2)), Number(trimmed.slice(2, 4)));
  }
  return null;
}

/** 입력 중에는 숫자와 구분자(-./)만 남긴다. */
export function sanitizeDateInput(text: string): string {
  return text.replace(/[^\d\-./]/g, "");
}

/** 숫자만 8자리 채워졌으면 더 입력할 게 없으니 바로 확정해도 되는 상태다. */
export function isCompleteDigitDate(text: string): boolean {
  return /^\d{8}$/.test(text);
}
