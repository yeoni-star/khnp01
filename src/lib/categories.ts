export const CATEGORIES = [
  "GRAIN",
  "KIMCHI",
  "PRODUCE",
  "MEAT",
  "PROCESSED",
] as const;

export type CategoryCode = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<CategoryCode, string> = {
  GRAIN: "양곡",
  KIMCHI: "김치류",
  PRODUCE: "농수산물",
  PROCESSED: "공산품",
  MEAT: "육류",
};

export function isCategoryCode(value: string): value is CategoryCode {
  return (CATEGORIES as readonly string[]).includes(value);
}
