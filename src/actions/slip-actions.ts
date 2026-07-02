"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { CATEGORIES } from "@/lib/categories";

type ActionResult = { ok: true } | { ok: false; message: string };

const createSlipSchema = z.object({
  vendorId: z.string().min(1, "업체를 선택해 주세요."),
  deliveryDate: z.string().min(1, "납품일자를 입력해 주세요."),
});

export async function createDraftSlip(formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = createSlipSchema.safeParse({
    vendorId: formData.get("vendorId"),
    deliveryDate: formData.get("deliveryDate"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };
  }
  const deliveryDate = new Date(parsed.data.deliveryDate);
  if (Number.isNaN(deliveryDate.getTime())) {
    return { ok: false, message: "납품일자를 올바르게 입력해 주세요." };
  }

  const slip = await db.deliverySlip.create({
    data: {
      restaurant: session.restaurant,
      vendorId: parsed.data.vendorId,
      deliveryDate,
      sourceType: "MANUAL",
    },
  });

  revalidatePath("/slips");
  redirect(`/slips/${slip.id}`);
}

const itemInputSchema = z.object({
  itemName: z.string().trim(),
  category: z.enum(CATEGORIES).nullable(),
  unit: z.string().trim(),
  quantity: z.coerce.number(),
  unitPrice: z.coerce.number().int(),
  matchedContractItemId: z.string().nullable().optional(),
  matchType: z.enum(["EXACT", "FUZZY_CONFIRMED", "NONE"]),
  priceOverridden: z.boolean().optional(),
});

function parseItemsJson(itemsJson: string) {
  let raw: unknown;
  try {
    raw = JSON.parse(itemsJson);
  } catch {
    return { ok: false as const, message: "품목 데이터를 확인해 주세요." };
  }
  const parsed = z.array(itemInputSchema).safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, message: "품목 데이터를 확인해 주세요." };
  }
  return { ok: true as const, items: parsed.data.filter((row) => row.itemName.trim()) };
}

async function replaceSlipItems(slipId: string, itemsJson: string) {
  const parsed = parseItemsJson(itemsJson);
  if (!parsed.ok) return parsed;

  await db.$transaction([
    db.deliverySlipItem.deleteMany({ where: { slipId } }),
    db.deliverySlip.update({
      where: { id: slipId },
      data: {
        items: {
          create: parsed.items.map((row) => ({
            itemName: row.itemName,
            category: row.category,
            unit: row.unit,
            quantity: row.quantity,
            unitPrice: row.unitPrice,
            amount: Math.round(row.quantity * row.unitPrice),
            matchedContractItemId: row.matchedContractItemId || null,
            matchType: row.matchType,
            priceOverridden: Boolean(row.priceOverridden),
          })),
        },
      },
    }),
  ]);

  return { ok: true as const };
}

export async function saveSlipDraft(slipId: string, itemsJson: string): Promise<ActionResult> {
  await requireSession();
  const result = await replaceSlipItems(slipId, itemsJson);
  if (!result.ok) return result;

  revalidatePath(`/slips/${slipId}`);
  revalidatePath("/slips");
  return { ok: true };
}

export async function confirmSlip(slipId: string, itemsJson: string): Promise<ActionResult> {
  await requireSession();
  const parsed = parseItemsJson(itemsJson);
  if (!parsed.ok) return parsed;

  if (parsed.items.length === 0) {
    return { ok: false, message: "품목을 1개 이상 입력해 주세요." };
  }
  for (const row of parsed.items) {
    if (!row.unit) {
      return { ok: false, message: `"${row.itemName}"의 단위를 입력해 주세요.` };
    }
    if (!(row.quantity > 0)) {
      return { ok: false, message: `"${row.itemName}"의 수량을 입력해 주세요.` };
    }
    if (row.unitPrice < 0) {
      return { ok: false, message: `"${row.itemName}"의 단가를 확인해 주세요.` };
    }
  }

  const replaced = await replaceSlipItems(slipId, itemsJson);
  if (!replaced.ok) return replaced;

  await db.deliverySlip.update({
    where: { id: slipId },
    data: { status: "CONFIRMED", confirmedAt: new Date() },
  });

  revalidatePath(`/slips/${slipId}`);
  revalidatePath("/slips");
  return { ok: true };
}

export async function deleteSlip(slipId: string): Promise<ActionResult> {
  await requireSession();
  await db.deliverySlip.delete({ where: { id: slipId } });
  revalidatePath("/slips");
  return { ok: true };
}
