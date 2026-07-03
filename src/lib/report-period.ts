import { CATEGORIES, type CategoryCode } from "./categories";

export function defaultMonthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export function parseDateRange(
  start?: string,
  end?: string
): { startDate: Date; endDate: Date; startStr: string; endStr: string } {
  const defaults = defaultMonthRange();
  const startStr = start || defaults.start;
  const endStr = end || defaults.end;
  const startDate = new Date(`${startStr}T00:00:00.000Z`);
  const endDate = new Date(`${endStr}T23:59:59.999Z`);
  return { startDate, endDate, startStr, endStr };
}

export function parseCategories(raw?: string | string[]): CategoryCode[] | undefined {
  if (!raw) return undefined;
  const list = Array.isArray(raw) ? raw : raw.split(",");
  const parts = list.filter((c): c is CategoryCode => (CATEGORIES as readonly string[]).includes(c));
  return parts.length > 0 ? parts : undefined;
}
