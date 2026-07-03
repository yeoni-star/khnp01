import { z } from "zod";

export const INSPECTION_COLUMN_TYPES = ["CHECK", "TEXT", "DATE", "SELECT"] as const;
export type InspectionColumnType = (typeof INSPECTION_COLUMN_TYPES)[number];

export const INSPECTION_COLUMN_TYPE_LABELS: Record<InspectionColumnType, string> = {
  CHECK: "O/X",
  TEXT: "텍스트",
  DATE: "날짜",
  SELECT: "목록박스",
};

export const inspectionColumnSchema = z
  .object({
    key: z.string().trim().min(1),
    label: z.string().trim().min(1),
    type: z.enum(INSPECTION_COLUMN_TYPES),
    options: z.array(z.string().trim().min(1)).optional(),
  })
  .refine((c) => c.type !== "SELECT" || (c.options && c.options.length > 0), {
    message: "목록박스 타입은 옵션을 1개 이상 입력해야 합니다.",
  });

export const inspectionColumnsSchema = z.array(inspectionColumnSchema);

export type InspectionColumn = z.infer<typeof inspectionColumnSchema>;

/** 확정된 거래명세표에서 그대로 채워지는 고정 컬럼 (커스터마이징 불가) */
export const INSPECTION_BASE_COLUMN_LABELS = ["품목명", "단위", "수량", "납품업체"] as const;
