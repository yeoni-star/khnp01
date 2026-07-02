import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { buildVendorReport } from "@/lib/vendor-report";
import { buildVendorReportWorkbook } from "@/lib/excel/build-vendor-report-workbook";
import { CATEGORY_LABELS } from "@/lib/categories";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  const { searchParams } = new URL(request.url);
  const vendorId = searchParams.get("vendorId");
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));

  if (!vendorId || !year || !month) {
    return NextResponse.json({ message: "잘못된 요청입니다." }, { status: 400 });
  }

  const vendor = await db.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) {
    return NextResponse.json({ message: "업체를 찾을 수 없습니다." }, { status: 404 });
  }

  const [report, contract] = await Promise.all([
    buildVendorReport(session.restaurant, vendorId, year, month),
    db.contract.findFirst({ where: { vendorId }, orderBy: { startDate: "desc" }, select: { category: true } }),
  ]);
  const buffer = await buildVendorReportWorkbook({
    vendorName: vendor.name,
    categoryLabel: contract ? CATEGORY_LABELS[contract.category] : null,
    year,
    month,
    report,
  });

  const filename = encodeURIComponent(`납품보고서_${vendor.name}_${year}-${String(month).padStart(2, "0")}.xlsx`);

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="report.xlsx"; filename*=UTF-8''${filename}`,
    },
  });
}
