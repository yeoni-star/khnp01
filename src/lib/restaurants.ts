export const RESTAURANTS = ["A", "B"] as const;

export type RestaurantCode = (typeof RESTAURANTS)[number];

export const RESTAURANT_LABELS: Record<RestaurantCode, string> = {
  A: "식당 A",
  B: "식당 B",
};

export function isRestaurantCode(value: string): value is RestaurantCode {
  return (RESTAURANTS as readonly string[]).includes(value);
}
