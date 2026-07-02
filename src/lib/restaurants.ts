export const RESTAURANTS = ["A", "B"] as const;

export type RestaurantCode = (typeof RESTAURANTS)[number];

export const RESTAURANT_LABELS: Record<RestaurantCode, string> = {
  A: "본관",
  B: "후문",
};

export function isRestaurantCode(value: string): value is RestaurantCode {
  return (RESTAURANTS as readonly string[]).includes(value);
}
