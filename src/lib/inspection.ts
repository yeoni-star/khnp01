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

/** 새 식당에서 검수일지를 처음 쓸 때 기본으로 제공하는 예시 컬럼 구성 (자유롭게 수정 가능) */
export const DEFAULT_INSPECTION_COLUMNS: InspectionColumn[] = [
  { key: "packaging", label: "포장", type: "CHECK" },
  { key: "quality", label: "품질", type: "CHECK" },
  { key: "expiry", label: "유통기한/제조일", type: "DATE" },
  { key: "temp", label: "온도", type: "TEXT" },
  { key: "action", label: "조치사항", type: "TEXT" },
];
