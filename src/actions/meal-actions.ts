"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { mealCompanySchema } from "@/lib/meal";

type ActionResult = { ok: true } | { ok: false; message: string };

function revalidateMealPaths() {
  revalidatePath("/meal-settlement/companies");
  revalidatePath("/meal-settlement");
  revalidatePath("/meal-register");
}

export async function createMealCompany(input: {
  name: string;
  pricePerMeal: number;
  memo?: string;
}): Promise<ActionResult> {
  await requireSession();
  const parsed = mealCompanySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };
  }
  const exists = await db.mealCompany.findUnique({ where: { name: parsed.data.name } });
  if (exists) return { ok: false, message: "이미 등록된 업체명입니다." };

  await db.mealCompany.create({
    data: {
      name: parsed.data.name,
      pricePerMeal: parsed.data.pricePerMeal,
      memo: parsed.data.memo || null,
    },
  });
  revalidateMealPaths();
  return { ok: true };
}

export async function updateMealCompany(
  id: string,
  input: { name: string; pricePerMeal: number; memo?: string }
): Promise<ActionResult> {
  await requireSession();
  const parsed = mealCompanySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };
  }
  const dup = await db.mealCompany.findFirst({ where: { name: parsed.data.name, NOT: { id } } });
  if (dup) return { ok: false, message: "이미 등록된 업체명입니다." };

  await db.mealCompany.update({
    where: { id },
    data: {
      name: parsed.data.name,
      pricePerMeal: parsed.data.pricePerMeal,
      memo: parsed.data.memo || null,
    },
  });
  revalidateMealPaths();
  return { ok: true };
}

export async function deleteMealCompany(id: string): Promise<ActionResult> {
  await requireSession();
  const count = await db.mealRegistration.count({ where: { companyId: id } });
  if (count > 0) {
    return { ok: false, message: "해당 업체로 등록된 식사 기록이 있어 삭제할 수 없습니다." };
  }
  await db.mealCompany.delete({ where: { id } });
  revalidateMealPaths();
  return { ok: true };
}
