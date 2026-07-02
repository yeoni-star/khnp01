import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { isOcrConfigured } from "@/lib/env";
import { saveUploadedFile } from "@/lib/storage";
import { extractSlipFromFile } from "@/lib/ocr/extract";

const ACCEPTED_TYPES: Record<string, "image/jpeg" | "image/png" | "application/pdf"> = {
  "image/jpeg": "image/jpeg",
  "image/png": "image/png",
  "application/pdf": "application/pdf",
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slipId: string }> }
) {
  const session = await requireSession();
  const { slipId } = await params;

  if (!isOcrConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        code: "OCR_NOT_CONFIGURED",
        message: "OCR가 설정되지 않았습니다. 직접 입력을 이용해 주세요.",
      },
      { status: 400 }
    );
  }

  const slip = await db.deliverySlip.findUnique({ where: { id: slipId } });
  if (!slip || slip.restaurant !== session.restaurant) {
    return NextResponse.json({ ok: false, message: "거래명세표를 찾을 수 없습니다." }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "파일을 선택해 주세요." }, { status: 400 });
  }

  const mediaType = ACCEPTED_TYPES[file.type];
  if (!mediaType) {
    return NextResponse.json(
      { ok: false, message: "PDF 또는 JPG/PNG 파일만 업로드할 수 있습니다." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");

  const sourceFileUrl = await saveUploadedFile(buffer, file.name);
  await db.deliverySlip.update({
    where: { id: slipId },
    data: { sourceType: "OCR", sourceFileUrl },
  });

  try {
    const ocrResult = await extractSlipFromFile({ base64, mediaType });

    await db.deliverySlip.update({
      where: { id: slipId },
      data: { ocrRawResponse: JSON.stringify(ocrResult) },
    });

    return NextResponse.json({
      ok: true,
      vendorNameGuess: ocrResult.vendorNameGuess,
      deliveryDateGuess: ocrResult.deliveryDateGuess,
      notes: ocrResult.notes,
      items: ocrResult.items,
    });
  } catch (error) {
    console.error("OCR extraction failed", error);
    return NextResponse.json(
      {
        ok: false,
        code: "OCR_FAILED",
        message: "이미지를 인식하지 못했습니다. 직접 입력해 주세요.",
      },
      { status: 200 }
    );
  }
}
