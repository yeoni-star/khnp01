import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { buildMealSettlementWorkbook } from "@/lib/excel/build-meal-settlement-workbook";

function getKstDateRange(startStr: string, endStr: string) {
  const start = new Date(`${startStr}T00:00:00+09:00`);
  const end = new Date(`${endStr}T23:59:59.999+09:00`);
  return { start, end };
}

export async function GET(request: NextRequest) {
  const session = await requireSession();
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const defaultStartStr = new Date(kstNow.getFullYear(), kstNow.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const defaultEndStr = new Date(kstNow.getFullYear(), kstNow.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);

  const startStr = searchParams.get("start") || defaultStartStr;
  const endStr = searchParams.get("end") || defaultEndStr;

  if (!companyId) {
    return NextResponse.json({ message: "잘못된 요청입니다." }, { status: 400 });
  }

  const company = await db.mealCompany.findUnique({ where: { id: companyId } });
  if (!company) {
    return NextResponse.json({ message: "업체를 찾을 수 없습니다." }, { status: 404 });
  }

  const { start, end } = getKstDateRange(startStr, endStr);
  
  const registrations = await db.mealRegistration.findMany({
    where: { restaurant: session.restaurant, companyId, mealDate: { gte: start, lte: end } },
    orderBy: [{ mealDate: "asc" }, { submittedAt: "asc" }],
  });

  let totalLunchCount = 0;
  let totalDinnerCount = 0;
  const userMap = new Map<string, {
    name: string;
    phone: string;
    lunchCount: number;
    dinnerCount: number;
  }>();

  for (const r of registrations) {
    const key = `${r.submitterName}_${r.phone}`;
    const entry = userMap.get(key) ?? {
      name: r.submitterName,
      phone: r.phone,
      lunchCount: 0,
      dinnerCount: 0,
    };
    if (r.mealType === "LUNCH") {
      entry.lunchCount++;
      totalLunchCount++;
    } else {
      entry.dinnerCount++;
      totalDinnerCount++;
    }
    userMap.set(key, entry);
  }

  const userStats = [...userMap.values()]
    .sort((a, b) => a.name.localeCompare(b.name, "ko"))
    .map(u => ({
      ...u,
      totalCount: u.lunchCount + u.dinnerCount,
      totalAmount: (u.lunchCount + u.dinnerCount) * company.pricePerMeal
    }));

  const monthLabel = `${startStr} ~ ${endStr}`;

  const buffer = await buildMealSettlementWorkbook({
    companyName: company.name,
    monthLabel,
    pricePerMeal: company.pricePerMeal,
    totalLunchCount,
    totalDinnerCount,
    rows: userStats,
  });

  // Safe ASCII filename to ensure the browser keeps the .xlsx extension
  const safeFilename = `meal_settlement_${startStr}_${endStr}.xlsx`;

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${safeFilename}"`,
    },
  });
}
