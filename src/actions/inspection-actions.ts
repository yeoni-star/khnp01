"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { inspectionColumnsSchema } from "@/lib/inspection";

type ActionResult = { ok: true } | { ok: false; message: string };

export async function saveInspectionTemplate(columnsJson: string): Promise<ActionResult> {
  const session = await requireSession();

  let raw: unknown;
  try {
    raw = JSON.parse(columnsJson);
  } catch {
    return { ok: false, message: "컬럼 데이터를 확인해 주세요." };
  }
  const parsed = inspectionColumnsSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "컬럼 데이터를 확인해 주세요." };
  }
  if (parsed.data.length === 0) {
    return { ok: false, message: "컬럼을 1개 이상 추가해 주세요." };
  }
  const keys = parsed.data.map((c) => c.key);
  if (new Set(keys).size !== keys.length) {
    return { ok: false, message: "컬럼 키가 중복되었습니다." };
  }

  await db.inspectionTemplate.upsert({
    where: { restaurant: session.restaurant },
    update: { columns: parsed.data },
    create: { restaurant: session.restaurant, columns: parsed.data },
  });

  revalidatePath("/inspection/template");
  return { ok: true };
}

function parseDateParam(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/** 해당 로그의 식당+날짜 기준 확정(CONFIRMED)된 거래명세표 품목 중, 아직 로그에 없는 것만 새 행으로 추가한다. */
export async function importConfirmedSlipsToLog(logId: string): Promise<ActionResult> {
  await requireSession();
  const log = await db.inspectionLog.findUnique({ where: { id: logId } });
  if (!log) return { ok: false, message: "검수일지를 찾을 수 없습니다." };

  const dayStart = log.logDate;
  const dayEnd = new Date(log.logDate);
  dayEnd.setUTCHours(23, 59, 59, 999);

  const [slips, existingRows, maxOrder] = await Promise.all([
    db.deliverySlip.findMany({
      where: {
        restaurant: log.restaurant,
        status: "CONFIRMED",
        deliveryDate: { gte: dayStart, lte: dayEnd },
      },
      include: { items: true, vendor: true },
    }),
    db.inspectionLogRow.findMany({ where: { logId }, select: { sourceItemId: true } }),
    db.inspectionLogRow.aggregate({ where: { logId }, _max: { order: true } }),
  ]);

  const existingSourceIds = new Set(existingRows.map((r) => r.sourceItemId).filter((v): v is string => Boolean(v)));
  let orderCursor = (maxOrder._max.order ?? -1) + 1;

  const newRows = slips.flatMap((slip) =>
    slip.items
      .filter((item) => !existingSourceIds.has(item.id))
      .map((item) => ({
        logId,
        sourceItemId: item.id,
        itemName: item.itemName,
        unit: item.unit,
        quantity: item.quantity,
        vendorName: slip.vendor.name,
        values: {},
        order: orderCursor++,
      }))
  );

  if (newRows.length > 0) {
    await db.inspectionLogRow.createMany({ data: newRows });
  }

  return { ok: true };
}

/** 해당 날짜의 검수일지를 가져오거나 없으면 새로 만들고, 새로 만든 경우 확정 거래명세표를 자동으로 1회 불러온다. */
export async function getOrCreateInspectionLog(dateStr: string): Promise<string> {
  const session = await requireSession();
  const logDate = parseDateParam(dateStr);

  const existing = await db.inspectionLog.findUnique({
    where: { restaurant_logDate: { restaurant: session.restaurant, logDate } },
  });
  if (existing) return existing.id;

  const created = await db.inspectionLog.create({
    data: { restaurant: session.restaurant, logDate },
  });
  await importConfirmedSlipsToLog(created.id);
  return created.id;
}

const inspectionRowInputSchema = z.object({
  sourceItemId: z.string().nullable(),
  itemName: z.string().trim().min(1),
  unit: z.string().trim(),
  quantity: z.coerce.number(),
  vendorName: z.string().trim(),
  values: z.record(z.string(), z.string()),
});

export async function saveInspectionLog(
  logId: string,
  inspectorName: string,
  rowsJson: string
): Promise<ActionResult> {
  await requireSession();

  let raw: unknown;
  try {
    raw = JSON.parse(rowsJson);
  } catch {
    return { ok: false, message: "품목 데이터를 확인해 주세요." };
  }
  const parsed = z.array(inspectionRowInputSchema).safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "품목 데이터를 확인해 주세요." };
  }

  const log = await db.inspectionLog.findUnique({ where: { id: logId } });
  if (!log) return { ok: false, message: "검수일지를 찾을 수 없습니다." };

  await db.$transaction([
    db.inspectionLogRow.deleteMany({ where: { logId } }),
    db.inspectionLog.update({
      where: { id: logId },
      data: {
        inspectorName: inspectorName.trim() || null,
        rows: {
          create: parsed.data.map((row, index) => ({
            sourceItemId: row.sourceItemId,
            itemName: row.itemName,
            unit: row.unit,
            quantity: row.quantity,
            vendorName: row.vendorName,
            values: row.values,
            order: index,
          })),
        },
      },
    }),
  ]);

  revalidatePath(`/inspection/${log.logDate.toISOString().slice(0, 10)}`);
  revalidatePath("/inspection");
  return { ok: true };
}
