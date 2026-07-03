import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { isTaxTypeCode } from "@/lib/tax";
import { buildSlipImportTemplate } from "@/lib/excel/build-slip-import-template";

export async function GET(request: NextRequest) {
  await requireSession();
  const { searchParams } = new URL(request.url);
  const taxTypeParam = searchParams.get("taxType") ?? "";

  if (!isTaxTypeCode(taxTypeParam)) {
    return NextResponse.json({ message: "잘못된 요청입니다." }, { status: 400 });
  }

  const buffer = await buildSlipImportTemplate(taxTypeParam);
  const filename = encodeURIComponent(
    `거래명세표_업로드양식_${taxTypeParam === "TAXABLE" ? "과세" : "면세"}.xlsx`
  );

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="template.xlsx"; filename*=UTF-8''${filename}`,
    },
  });
}
