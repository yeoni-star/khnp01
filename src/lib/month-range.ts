const MONTH_PATTERN = /^\d{4}-\d{2}$/;

export function currentMonthStr(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** 쿼리 파라미터로 받은 월 문자열을 검증하고, 미래 월은 이번 달로 고정한다. */
export function parseMonthParam(raw?: string): string {
  const current = currentMonthStr();
  if (raw && MONTH_PATTERN.test(raw)) {
    return raw > current ? current : raw;
  }
  return current;
}

export function getMonthRange(monthStr: string): { start: Date; end: Date } {
  const [y, m] = monthStr.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
  return { start, end };
}

export function shiftMonth(monthStr: string, delta: number): string {
  const [y, m] = monthStr.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** 쿼리 파라미터로 받은 날짜 문자열을 검증한다. 형식이 다르면 null. */
export function parseDateParam(raw?: string): string | null {
  return raw && DATE_PATTERN.test(raw) ? raw : null;
}

export function getDayRange(dateStr: string): { start: Date; end: Date } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, d));
  const end = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
  return { start, end };
}
