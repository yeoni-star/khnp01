import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { buildSummaryReport } from "@/lib/report-aggregate";
import { buildSummaryWorkbook } from "@/lib/excel/build-summary-workbook";
import { RESTAURANT_LABELS } from "@/lib/restaurants";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));

  if (!year || !month) {
    return NextResponse.json({ message: "잘못된 요청입니다." }, { status: 400 });
  }

  const report = await buildSummaryReport(session.restaurant, year, month);
  const buffer = await buildSummaryWorkbook({
    restaurantLabel: RESTAURANT_LABELS[session.restaurant],
    year,
    month,
    report,
  });

  const filename = encodeURIComponent(`전체통합요약_${RESTAURANT_LABELS[session.restaurant]}_${year}-${String(month).padStart(2, "0")}.xlsx`);

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="summary.xlsx"; filename*=UTF-8''${filename}`,
    },
  });
}
