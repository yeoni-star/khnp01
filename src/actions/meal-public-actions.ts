"use server";

import { db } from "@/lib/db";
import {
  mealRegistrationSchema,
  determineMealType,
  DEFAULT_MEAL_TIME_SETTINGS,
  MEAL_TYPE_LABELS,
  kstTodayDate,
  defaultMealScheduleEnabled,
} from "@/lib/meal";
import { RESTAURANT_LABELS, type RestaurantCode } from "@/lib/restaurants";

type ActionResult =
  | {
      ok: true;
      submittedAt: string;
      mealDate: string;
      mealTypeLabel: string;
      companyName: string;
      restaurantLabel: string;
      sequenceNumber: number;
    }
  | { ok: false; message: string };

/** 비로그인 공개 폼(/meal-register)에서 호출되는 제출 액션. 인증 없이 접근 가능하다. */
export async function submitMealRegistration(input: {
  restaurant: string;
  companyId: string;
  submitterName: string;
  phone: string;
}): Promise<ActionResult> {
  const parsed = mealRegistrationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };
  }

  const restaurant = parsed.data.restaurant as RestaurantCode;
  const now = new Date();
  const mealDate = kstTodayDate(now);
  const todayStr = mealDate.toISOString().slice(0, 10);
  const weekday = mealDate.getUTCDay();

  // DB에서 시간 설정 읽기 (없으면 기본값 사용)
  const timeSettings = await db.mealTimeSettings.findUnique({ where: { id: "global" } });
  const mealType = determineMealType(now, timeSettings ?? DEFAULT_MEAL_TIME_SETTINGS);

  if (!mealType) {
    const settings = timeSettings ?? DEFAULT_MEAL_TIME_SETTINGS;
    const [lunchSchedule, dinnerSchedule] = await Promise.all([
      db.mealDailySchedule.findUnique({
        where: { date_restaurant_mealType: { date: mealDate, restaurant, mealType: "LUNCH" } },
      }),
      db.mealDailySchedule.findUnique({
        where: { date_restaurant_mealType: { date: mealDate, restaurant, mealType: "DINNER" } },
      }),
    ]);
    const lunchEnabled = lunchSchedule?.enabled ?? defaultMealScheduleEnabled("LUNCH");
    const dinnerEnabled = dinnerSchedule?.enabled ?? defaultMealScheduleEnabled("DINNER");

    const parts: string[] = [];
    if (lunchEnabled) parts.push(`중식 ${settings.lunchStart}~${settings.lunchEnd}`);
    if (dinnerEnabled) parts.push(`석식 ${settings.dinnerStart}~${settings.dinnerEnd}`);

    return {
      ok: false,
      message:
        parts.length > 0
          ? `지금은 식사 등록 가능 시간이 아닙니다. (${parts.join(", ")})`
          : "오늘은 식사 등록을 받지 않는 날입니다.",
    };
  }

  if (weekday === 0 || weekday === 6) {
    return { ok: false, message: "주말에는 식사 등록을 받지 않습니다." };
  }

  const schedule = await db.mealDailySchedule.findUnique({
    where: { date_restaurant_mealType: { date: mealDate, restaurant, mealType } },
  });
  const scheduleEnabled = schedule?.enabled ?? defaultMealScheduleEnabled(mealType);
  if (!scheduleEnabled) {
    return {
      ok: false,
      message: `${RESTAURANT_LABELS[restaurant]}에서는 오늘 ${MEAL_TYPE_LABELS[mealType]}을 운영하지 않습니다.`,
    };
  }

  // 같은 날 같은 끼니에 동일 연락처로 이미 등록된 경우 중복 제출을 막는다.
  const existing = await db.mealRegistration.findFirst({
    where: { mealDate, mealType, phone: parsed.data.phone },
  });
  if (existing) {
    const existingSeq = await db.mealRegistration.count({
      where: {
        mealDate,
        mealType,
        restaurant: existing.restaurant,
        submittedAt: { lte: existing.submittedAt },
      },
    });
    return {
      ok: false,
      message: `이미 제출된 건입니다. ${MEAL_TYPE_LABELS[mealType]} #${existingSeq}번으로 등록되어 있습니다.`,
    };
  }

  const company = await db.mealCompany.findUnique({ where: { id: parsed.data.companyId } });
  if (!company) {
    return { ok: false, message: "선택한 업체를 찾을 수 없습니다. 다시 시도해 주세요." };
  }

  const created = await db.mealRegistration.create({
    data: {
      restaurant,
      companyId: parsed.data.companyId,
      submitterName: parsed.data.submitterName,
      phone: parsed.data.phone,
      mealType,
      mealDate,
      submittedAt: now,
    },
  });

  const sequenceNumber = await db.mealRegistration.count({
    where: {
      mealDate,
      mealType,
      restaurant,
      submittedAt: { lte: now },
    },
  });

  return {
    ok: true,
    submittedAt: created.submittedAt.toISOString(),
    mealDate: todayStr,
    mealTypeLabel: MEAL_TYPE_LABELS[mealType],
    companyName: company.name,
    restaurantLabel: RESTAURANT_LABELS[restaurant],
    sequenceNumber,
  };
}
