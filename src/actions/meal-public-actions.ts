"use server";

import { db } from "@/lib/db";
import { mealRegistrationSchema, determineMealType, MEAL_TIME_WINDOW_LABEL, MEAL_TYPE_LABELS } from "@/lib/meal";
import { RESTAURANT_LABELS, type RestaurantCode } from "@/lib/restaurants";

type ActionResult =
  | {
      ok: true;
      submittedAt: string;
      mealDate: string;
      mealTypeLabel: string;
      companyName: string;
      restaurantLabel: string;
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

  const now = new Date();
  // const mealType = determineMealType(now);
  const mealType = "LUNCH";
  // if (!mealType) {
  //   return {
  //     ok: false,
  //     message: `지금은 식사 등록 가능 시간이 아닙니다. (${MEAL_TIME_WINDOW_LABEL})`,
  //   };
  // }

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

  return {
    ok: true,
    submittedAt: created.submittedAt.toISOString(),
    mealDate: todayStr,
    mealTypeLabel: MEAL_TYPE_LABELS[mealType],
    companyName: company.name,
    restaurantLabel: RESTAURANT_LABELS[parsed.data.restaurant as RestaurantCode],
  };
}
