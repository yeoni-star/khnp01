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

export type MealTimeWindowSettings = {
  lunchStart: string;
  lunchEnd: string;
  dinnerStart: string;
  dinnerEnd: string;
};

export const DEFAULT_MEAL_TIME_SETTINGS: MealTimeWindowSettings = {
  lunchStart: "11:00",
  lunchEnd: "13:30",
  dinnerStart: "17:00",
  dinnerEnd: "19:30",
};

/** "HH:mm" 문자열을 분(0~1439)으로 변환한다. */
function timeStrToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** 서버 시간대와 무관하게 한국 표준시(KST, UTC+9) 기준 분(00:00부터)을 계산한다. */
function kstMinutesOfDay(now: Date): number {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.getUTCHours() * 60 + kst.getUTCMinutes();
}

export const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** 한국 표준시(KST) 기준 오늘 날짜를 자정(UTC) 기준 Date로 정규화해 반환한다. */
export function kstTodayDate(now: Date = new Date()): Date {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()));
}

/** 요일별 운영 스케줄 레코드가 없을 때의 끼니별 기본 운영 여부. 중식은 기본 운영, 석식은 기본 미운영. */
export function defaultMealScheduleEnabled(mealType: MealTypeCode): boolean {
  return mealType === "LUNCH";
}

/** 설정된 시간대(KST)를 기준으로 현재가 중식/석식 어디에 해당하는지 판정한다. 시간대 밖이면 null. */
export function determineMealType(
  now: Date,
  settings: MealTimeWindowSettings = DEFAULT_MEAL_TIME_SETTINGS
): MealTypeCode | null {
  const minutes = kstMinutesOfDay(now);
  const lunchStart = timeStrToMinutes(settings.lunchStart);
  const lunchEnd = timeStrToMinutes(settings.lunchEnd);
  const dinnerStart = timeStrToMinutes(settings.dinnerStart);
  const dinnerEnd = timeStrToMinutes(settings.dinnerEnd);
  if (minutes >= lunchStart && minutes <= lunchEnd) return "LUNCH";
  if (minutes >= dinnerStart && minutes <= dinnerEnd) return "DINNER";
  return null;
}
