import { describe, it, expect } from "vitest";
import { aggregateWeeklyCategorySpend } from "./weekly-category-spend";

describe("aggregateWeeklyCategorySpend", () => {
  it("converts monthly totals into day-count-based weekly averages per category", () => {
    const lastMonthItems = [
      { category: "MEAT" as const, amount: 140000 },
      { category: "MEAT" as const, amount: 140000 },
      { category: "PROCESSED" as const, amount: 62000 },
    ];
    const thisMonthItems = [{ category: "MEAT" as const, amount: 70000 }];

    const rows = aggregateWeeklyCategorySpend(lastMonthItems, thisMonthItems, 7, 28);

    const meat = rows.find((r) => r.category === "MEAT")!;
    expect(meat.lastMonthWeeklyAvg).toBe(70000); // 280000 / (28/7)
    expect(meat.thisMonthWeeklyAvg).toBe(70000); // 70000 / (7/7)

    const processed = rows.find((r) => r.category === "PROCESSED")!;
    expect(processed.lastMonthWeeklyAvg).toBe(15500); // 62000 / 4
    expect(processed.thisMonthWeeklyAvg).toBe(0);

    const grain = rows.find((r) => r.category === "GRAIN")!;
    expect(grain.lastMonthWeeklyAvg).toBe(0);
    expect(grain.thisMonthWeeklyAvg).toBe(0);
  });

  it("avoids divide-by-zero when no days have elapsed in the current month", () => {
    const rows = aggregateWeeklyCategorySpend([], [{ category: "GRAIN" as const, amount: 7000 }], 0, 30);
    const grain = rows.find((r) => r.category === "GRAIN")!;
    expect(grain.thisMonthWeeklyAvg).toBe(49000); // treated as 1 day elapsed -> 7000 / (1/7)
  });
});
