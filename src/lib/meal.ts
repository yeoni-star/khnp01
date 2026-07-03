import { z } from "zod";

export const mealCompanySchema = z.object({
  name: z.string().trim().min(1, "업체명을 입력해 주세요."),
  pricePerMeal: z.coerce.number().int().min(0, "단가는 0 이상이어야 합니다."),
  memo: z.string().trim().optional(),
});

export const mealRegistrationSchema = z.object({
  restaurant: z.enum(["A", "B"]),
  companyId: z.string().trim().min(1, "소속 업체를 선택해 주세요."),
  submitterName: z.string().trim().min(1, "이름을 입력해 주세요."),
  phone: z.string().trim().min(1, "연락처를 입력해 주세요."),
});

export const MEAL_TYPES = ["LUNCH", "DINNER"] as const;
export type MealTypeCode = (typeof MEAL_TYPES)[number];

export const MEAL_TYPE_LABELS: Record<MealTypeCode, string> = {
  LUNCH: "중식",
  DINNER: "석식",
};

const MEAL_WINDOWS: { type: MealTypeCode; startMin: number; endMin: number }[] = [
  { type: "LUNCH", startMin: 11 * 60, endMin: 13 * 60 + 30 },
  { type: "DINNER", startMin: 17 * 60, endMin: 19 * 60 + 30 },
];

export const MEAL_TIME_WINDOW_LABEL = "중식 11:00~13:30, 석식 17:00~19:30";

/** 서버 시간대와 무관하게 한국 표준시(KST, UTC+9) 기준 분(00:00부터)을 계산한다. */
function kstMinutesOfDay(now: Date): number {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.getUTCHours() * 60 + kst.getUTCMinutes();
}

/** 현재 시각이 식사 등록 가능 시간대(중식/석식)에 해당하는지 판정한다. 시간대 밖이면 null. */
export function determineMealType(now: Date): MealTypeCode | null {
  const minutes = kstMinutesOfDay(now);
  const window = MEAL_WINDOWS.find((w) => minutes >= w.startMin && minutes <= w.endMin);
  return window?.type ?? null;
}
