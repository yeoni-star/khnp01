"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";

type ActionResult = { ok: true } | { ok: false; message: string };

const vendorSchema = z.object({
  name: z.string().trim().min(1, "업체명을 입력해 주세요."),
  businessNo: z.string().trim().optional(),
  contact: z.string().trim().optional(),
  memo: z.string().trim().optional(),
});

function parseVendorForm(formData: FormData) {
  return vendorSchema.safeParse({
    name: formData.get("name"),
    businessNo: formData.get("businessNo") ?? undefined,
    contact: formData.get("contact") ?? undefined,
    memo: formData.get("memo") ?? undefined,
  });
}

export async function createVendor(formData: FormData): Promise<ActionResult> {
  await requireSession();
  const parsed = parseVendorForm(formData);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };
  }

  await db.vendor.create({
    data: {
      name: parsed.data.name,
      businessNo: parsed.data.businessNo || null,
      contact: parsed.data.contact || null,
      memo: parsed.data.memo || null,
    },
  });

  revalidatePath("/vendors");
  return { ok: true };
}

export async function updateVendor(vendorId: string, formData: FormData): Promise<ActionResult> {
  await requireSession();
  const parsed = parseVendorForm(formData);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };
  }

  await db.vendor.update({
    where: { id: vendorId },
    data: {
      name: parsed.data.name,
      businessNo: parsed.data.businessNo || null,
      contact: parsed.data.contact || null,
      memo: parsed.data.memo || null,
    },
  });

  revalidatePath("/vendors");
  revalidatePath(`/vendors/${vendorId}`);
  return { ok: true };
}

export async function deleteVendor(vendorId: string): Promise<ActionResult> {
  await requireSession();

  const [contractCount, slipCount] = await Promise.all([
    db.contract.count({ where: { vendorId } }),
    db.deliverySlip.count({ where: { vendorId } }),
  ]);
  if (contractCount > 0 || slipCount > 0) {
    return {
      ok: false,
      message: "계약 또는 거래명세표가 연결된 업체는 삭제할 수 없습니다.",
    };
  }

  await db.vendor.delete({ where: { id: vendorId } });
  revalidatePath("/vendors");
  return { ok: true };
}
