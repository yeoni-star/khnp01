import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import type { InspectionColumn } from "@/lib/inspection";
import { buildInspectionWorkbook } from "@/lib/excel/build-inspection-workbook";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const session = await requireSession();
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (!date || !DATE_PATTERN.test(date)) {
    return NextResponse.json({ message: "잘못된 요청입니다." }, { status: 400 });
  }

  const logDate = new Date(`${date}T00:00:00.000Z`);

  const [log, template] = await Promise.all([
    db.inspectionLog.findUnique({
      where: { restaurant_logDate: { restaurant: session.restaurant, logDate } },
      include: { rows: { orderBy: { order: "asc" } } },
    }),
    db.inspectionTemplate.findUnique({ where: { restaurant: session.restaurant } }),
  ]);

  const columns = (template?.columns as InspectionColumn[] | undefined) ?? [];

  const buffer = await buildInspectionWorkbook({
    dateStr: date,
    inspectorName: log?.inspectorName ?? null,
    columns,
    rows: (log?.rows ?? []).map((r) => ({
      itemName: r.itemName,
      unit: r.unit,
      quantity: r.quantity,
      vendorName: r.vendorName,
      values: r.values as Record<string, string>,
    })),
  });

  const filename = encodeURIComponent(`검수일지_${date}.xlsx`);

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="inspection.xlsx"; filename*=UTF-8''${filename}`,
    },
  });
}
