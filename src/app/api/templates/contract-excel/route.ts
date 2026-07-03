import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { isTaxTypeCode } from "@/lib/tax";
import { buildContractTemplate } from "@/lib/excel/build-contract-template";

export async function GET(request: NextRequest) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const taxTypeParam = searchParams.get("taxType") ?? "TAXABLE";

    if (!isTaxTypeCode(taxTypeParam)) {
      return NextResponse.json({ message: "잘못된 요청입니다." }, { status: 400 });
    }

    const buffer = await buildContractTemplate(taxTypeParam);
    const filename = encodeURIComponent(
      `계약단가표_양식_${taxTypeParam === "TAXABLE" ? "과세" : "면세"}.xlsx`
    );

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="contract_template.xlsx"; filename*=UTF-8''${filename}`,
      },
    });
  } catch (error: any) {
    console.error("Contract template API error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
