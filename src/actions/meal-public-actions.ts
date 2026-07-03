"use server";

import { db } from "@/lib/db";
import { mealRegistrationSchema, MEAL_TYPE_LABELS } from "@/lib/meal";
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

/** "HH:mm" 문자열을 분(0~1439)으로 변환 */
function timeStrToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** KST 기준 현재 시각을 분으로 반환 */
function kstMinutesNow(now: Date): number {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.getUTCHours() * 60 + kst.getUTCMinutes();
}

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

  const now = new Date();

  // DB에서 시간 설정 읽기 (없으면 기본값 사용)
  const timeSettings = await db.mealTimeSettings.findUnique({ where: { id: "global" } });
  const lunchStart = timeStrToMinutes(timeSettings?.lunchStart ?? "11:00");
  const lunchEnd   = timeStrToMinutes(timeSettings?.lunchEnd   ?? "13:30");
  const dinnerStart= timeStrToMinutes(timeSettings?.dinnerStart ?? "17:00");
  const dinnerEnd  = timeStrToMinutes(timeSettings?.dinnerEnd   ?? "19:30");

  const currentMin = kstMinutesNow(now);
  let mealType: "LUNCH" | "DINNER" | null = null;
  if (currentMin >= lunchStart && currentMin <= lunchEnd) mealType = "LUNCH";
  else if (currentMin >= dinnerStart && currentMin <= dinnerEnd) mealType = "DINNER";

  if (!mealType) {
    const lunchLabel  = `${timeSettings?.lunchStart  ?? "11:00"}~${timeSettings?.lunchEnd  ?? "13:30"}`;
    const dinnerLabel = `${timeSettings?.dinnerStart ?? "17:00"}~${timeSettings?.dinnerEnd ?? "19:30"}`;
    return {
      ok: false,
      message: `지금은 식사 등록 가능 시간이 아닙니다. (중식 ${lunchLabel}, 석식 ${dinnerLabel})`,
    };
  }

  const company = await db.mealCompany.findUnique({ where: { id: parsed.data.companyId } });
  if (!company) {
    return { ok: false, message: "선택한 업체를 찾을 수 없습니다. 다시 시도해 주세요." };
  }

  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const todayStr = kstNow.toISOString().slice(0, 10);
  const mealDate = new Date(`${todayStr}T00:00:00.000Z`);

  const created = await db.mealRegistration.create({
    data: {
      restaurant: parsed.data.restaurant as RestaurantCode,
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
      restaurant: parsed.data.restaurant as RestaurantCode,
      submittedAt: { lte: now },
    },
  });

  return {
    ok: true,
    submittedAt: created.submittedAt.toISOString(),
    mealDate: todayStr,
    mealTypeLabel: MEAL_TYPE_LABELS[mealType],
    companyName: company.name,
    restaurantLabel: RESTAURANT_LABELS[parsed.data.restaurant as RestaurantCode],
    sequenceNumber,
  };
}
