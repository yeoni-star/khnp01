import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { getMonthRange, parseMonthParam } from "@/lib/month-range";
import { RESTAURANT_LABELS, type RestaurantCode } from "@/lib/restaurants";
import { buildMealSettlementWorkbook } from "@/lib/excel/build-meal-settlement-workbook";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const month = parseMonthParam(searchParams.get("month") ?? undefined);

  if (!companyId) {
    return NextResponse.json({ message: "잘못된 요청입니다." }, { status: 400 });
  }

  const company = await db.mealCompany.findUnique({ where: { id: companyId } });
  if (!company) {
    return NextResponse.json({ message: "업체를 찾을 수 없습니다." }, { status: 404 });
  }

  const { start, end } = getMonthRange(month);
  const registrations = await db.mealRegistration.findMany({
    where: { restaurant: session.restaurant, companyId, mealDate: { gte: start, lte: end } },
    orderBy: [{ mealDate: "asc" }, { submittedAt: "asc" }],
  });

  const [y, m] = month.split("-").map(Number);
  const monthLabel = `${y}년 ${m}월`;

  const buffer = await buildMealSettlementWorkbook({
    companyName: company.name,
    monthLabel,
    pricePerMeal: company.pricePerMeal,
    rows: registrations.map((r) => ({
      mealDate: r.mealDate.toISOString().slice(0, 10),
      restaurantLabel: RESTAURANT_LABELS[r.restaurant as RestaurantCode],
      submitterName: r.submitterName,
      phone: r.phone,
      submittedAt: r.submittedAt.toLocaleString("ko-KR"),
    })),
  });

  const filename = encodeURIComponent(`${company.name}_식수정산_${month}.xlsx`);

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="meal-settlement.xlsx"; filename*=UTF-8''${filename}`,
    },
  });
}
