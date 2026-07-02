"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { CATEGORIES } from "@/lib/categories";
import { hasOverlappingContract } from "@/lib/pricing";

type ActionResult = { ok: true } | { ok: false; message: string };

const itemSchema = z.object({
  itemName: z.string().trim().min(1),
  unit: z.string().trim().min(1, "품목마다 단위를 입력해 주세요."),
  unitPrice: z.coerce.number().int("단가는 정수로 입력해 주세요.").nonnegative("단가는 0 이상이어야 합니다."),
});

const contractFormSchema = z.object({
  vendorName: z.string().trim().min(1, "업체명을 입력해 주세요."),
  category: z.enum(CATEGORIES, { message: "카테고리를 선택해 주세요." }),
  startDate: z.string().min(1, "계약 시작일을 입력해 주세요."),
  endDate: z.string().min(1, "계약 종료일을 입력해 주세요."),
  title: z.string().trim().optional(),
  memo: z.string().trim().optional(),
  itemsJson: z.string(),
});

function parseItemsJson(itemsJson: string) {
  let raw: unknown;
  try {
    raw = JSON.parse(itemsJson);
  } catch {
    return { ok: false as const, message: "품목 데이터를 확인해 주세요." };
  }
  const parsed = z.array(itemSchema).min(1, "품목을 1개 이상 입력해 주세요.").safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, message: parsed.error.issues[0]?.message ?? "품목 데이터를 확인해 주세요." };
  }
  return { ok: true as const, items: parsed.data };
}

function parseContractForm(formData: FormData) {
  const parsed = contractFormSchema.safeParse({
    vendorName: formData.get("vendorName"),
    category: formData.get("category"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    title: formData.get("title") ?? undefined,
    memo: formData.get("memo") ?? undefined,
    itemsJson: formData.get("itemsJson"),
  });
  if (!parsed.success) {
    return { ok: false as const, message: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };
  }

  const startDate = new Date(parsed.data.startDate);
  const endDate = new Date(parsed.data.endDate);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return { ok: false as const, message: "계약기간을 올바르게 입력해 주세요." };
  }
  if (startDate > endDate) {
    return { ok: false as const, message: "계약 종료일은 시작일보다 빠를 수 없습니다." };
  }

  const itemsResult = parseItemsJson(parsed.data.itemsJson);
  if (!itemsResult.ok) {
    return itemsResult;
  }

  return {
    ok: true as const,
    vendorName: parsed.data.vendorName,
    category: parsed.data.category,
    startDate,
    endDate,
    title: parsed.data.title || null,
    memo: parsed.data.memo || null,
    items: itemsResult.items.map((item) => ({ ...item, category: parsed.data.category })),
  };
}

async function resolveVendorId(vendorName: string): Promise<string> {
  const vendor = await db.vendor.upsert({
    where: { name: vendorName },
    update: {},
    create: { name: vendorName },
  });
  return vendor.id;
}

export async function createContract(formData: FormData): Promise<ActionResult> {
  await requireSession();
  const parsed = parseContractForm(formData);
  if (!parsed.ok) return parsed;

  const vendorId = await resolveVendorId(parsed.vendorName);

  const overlap = await hasOverlappingContract(vendorId, parsed.startDate, parsed.endDate);
  if (overlap) {
    return { ok: false, message: "같은 업체에 기간이 겹치는 계약이 이미 있습니다." };
  }

  await db.contract.create({
    data: {
      vendorId,
      category: parsed.category,
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      title: parsed.title,
      memo: parsed.memo,
      items: { create: parsed.items },
    },
  });

  revalidatePath("/contracts");
  return { ok: true };
}

export async function updateContract(contractId: string, formData: FormData): Promise<ActionResult> {
  await requireSession();
  const parsed = parseContractForm(formData);
  if (!parsed.ok) return parsed;

  const vendorId = await resolveVendorId(parsed.vendorName);

  const overlap = await hasOverlappingContract(vendorId, parsed.startDate, parsed.endDate, contractId);
  if (overlap) {
    return { ok: false, message: "같은 업체에 기간이 겹치는 계약이 이미 있습니다." };
  }

  await db.$transaction([
    db.contractItem.deleteMany({ where: { contractId } }),
    db.contract.update({
      where: { id: contractId },
      data: {
        vendorId,
        category: parsed.category,
        startDate: parsed.startDate,
        endDate: parsed.endDate,
        title: parsed.title,
        memo: parsed.memo,
        items: { create: parsed.items },
      },
    }),
  ]);

  revalidatePath("/contracts");
  revalidatePath(`/contracts/${contractId}`);
  return { ok: true };
}

export async function deleteContract(contractId: string): Promise<ActionResult> {
  await requireSession();
  await db.contract.delete({ where: { id: contractId } });
  revalidatePath("/contracts");
  return { ok: true };
}
