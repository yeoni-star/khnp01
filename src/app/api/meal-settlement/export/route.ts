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
    details: string[];
  }>();

  for (const r of registrations) {
    const key = `${r.submitterName}_${r.phone}`;
    const entry = userMap.get(key) ?? {
      name: r.submitterName,
      phone: r.phone,
      lunchCount: 0,
      dinnerCount: 0,
      details: [],
    };
    
    const dateStr = r.mealDate.toISOString().slice(0, 10);
    const mmdd = dateStr.slice(5, 10).replace("-", ".");
    const typeLabel = r.mealType === "LUNCH" ? "중" : "석";
    entry.details.push(`${mmdd}(${typeLabel})`);

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
      totalAmount: (u.lunchCount + u.dinnerCount) * company.pricePerMeal,
      detailStr: u.details.join(", ")
    }));

  const monthLabel = `${startStr} ~ ${endStr}`;
  const detailRows = registrations.map(r => ({
    mealDate: new Date(r.mealDate.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10),
    mealTypeLabel: r.mealType === "LUNCH" ? "중식" : "석식",
    restaurantLabel: r.restaurant === "A" ? "본관" : "후문",
    submitterName: r.submitterName,
    phone: r.phone,
    submittedAt: r.submittedAt.toLocaleString("ko-KR", { 
      year: 'numeric', month: '2-digit', day: '2-digit', 
      hour: '2-digit', minute:'2-digit', second:'2-digit' 
    }),
  }));

  const buffer = await buildMealSettlementWorkbook({
    companyName: company.name,
    monthLabel,
    pricePerMeal: company.pricePerMeal,
    totalLunchCount,
    totalDinnerCount,
    summaryRows: userStats,
    detailRows,
  });

  // Safe ASCII filename to ensure the browser keeps the .xlsx extension
  const safeFilename = `meal_settlement_${startStr}_${endStr}.xlsx`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${safeFilename}"`,
    },
  });
}
