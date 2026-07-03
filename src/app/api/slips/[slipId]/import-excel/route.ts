import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { parseSlipExcel } from "@/lib/excel/parse-slip-excel";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slipId: string }> }
) {
  const session = await requireSession();
  const { slipId } = await params;

  const slip = await db.deliverySlip.findUnique({ where: { id: slipId } });
  if (!slip || slip.restaurant !== session.restaurant) {
    return NextResponse.json({ ok: false, message: "거래명세표를 찾을 수 없습니다." }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "파일을 선택해 주세요." }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return NextResponse.json({ ok: false, message: "엑셀(.xlsx) 파일만 업로드할 수 있습니다." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let items;
  try {
    items = await parseSlipExcel(buffer);
  } catch (error) {
    console.error("Excel parse failed", error);
    return NextResponse.json({ ok: false, message: "엑셀 파일을 읽는 중 오류가 발생했습니다." }, { status: 400 });
  }

  if (items.length === 0) {
    return NextResponse.json({
      ok: false,
      message: "품목을 찾을 수 없습니다. 제공된 양식과 헤더(품명/수량/단가 등)를 사용했는지 확인해 주세요.",
    });
  }

  await db.deliverySlip.update({
    where: { id: slipId },
    data: { sourceType: "EXCEL" },
  });

  return NextResponse.json({ ok: true, items });
}
