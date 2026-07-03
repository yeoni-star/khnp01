import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { parseContractExcel } from "@/lib/excel/parse-contract-excel";

export async function POST(request: NextRequest) {
  try {
    await requireSession();

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
      items = await parseContractExcel(buffer);
    } catch (error) {
      console.error("Contract Excel parse failed", error);
      return NextResponse.json({ ok: false, message: "엑셀 파일을 읽는 중 오류가 발생했습니다." }, { status: 400 });
    }

    if (items.length === 0) {
      return NextResponse.json({
        ok: false,
        message: "품목을 찾을 수 없습니다. 계약단가표 양식을 준수하여 업로드해 주세요.",
      });
    }

    return NextResponse.json({ ok: true, items });
  } catch (error: any) {
    console.error("Contract excel import API error:", error);
    return NextResponse.json({ ok: false, message: "Internal Server Error" }, { status: 500 });
  }
}
