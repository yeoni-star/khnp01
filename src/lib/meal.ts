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
