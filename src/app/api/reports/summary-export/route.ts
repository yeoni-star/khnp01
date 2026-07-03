import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { buildSummaryReport } from "@/lib/report-aggregate";
import { buildSummaryWorkbook } from "@/lib/excel/build-summary-workbook";
import { formatReportPeriod } from "@/lib/vendor-report";
import { parseDateRange, parseCategories } from "@/lib/report-period";
import { RESTAURANT_LABELS } from "@/lib/restaurants";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start") ?? undefined;
  const end = searchParams.get("end") ?? undefined;
  const categories = parseCategories(searchParams.get("categories") ?? undefined);
  const vendorIds = searchParams.getAll("vendorIds");

  const { startDate, endDate, startStr, endStr } = parseDateRange(start, end);

  const report = await buildSummaryReport(session.restaurant, startDate, endDate, {
    vendorIds: vendorIds.length > 0 ? vendorIds : undefined,
    categories,
  });
  const buffer = await buildSummaryWorkbook({
    restaurantLabel: RESTAURANT_LABELS[session.restaurant],
    periodLabel: formatReportPeriod(startDate, endDate),
    report,
  });

  const filename = encodeURIComponent(`전체통합요약_${RESTAURANT_LABELS[session.restaurant]}_${startStr}_${endStr}.xlsx`);

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="summary.xlsx"; filename*=UTF-8''${filename}`,
    },
  });
}
