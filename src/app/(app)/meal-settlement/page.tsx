import Link from "next/link";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getMonthRange, parseMonthParam } from "@/lib/month-range";
import MonthCalendar from "@/components/common/MonthCalendar";

export default async function MealSettlementPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const month = parseMonthParam(sp.month);
  const { start, end } = getMonthRange(month);

  const session = await getSession();
  const restaurant = session!.restaurant;

  const registrations = await db.mealRegistration.findMany({
    where: { restaurant, mealDate: { gte: start, lte: end } },
    include: { company: true },
  });

  const byCompany = new Map<
    string,
    {
      name: string;
      price: number;
      lunchCount: number;
      dinnerCount: number;
    }
  >();

  for (const r of registrations) {
    const entry = byCompany.get(r.companyId) ?? {
      name: r.company.name,
      price: r.company.pricePerMeal,
      lunchCount: 0,
      dinnerCount: 0,
    };
    if (r.mealType === "LUNCH") entry.lunchCount += 1;
    else entry.dinnerCount += 1;
    byCompany.set(r.companyId, entry);
  }

  const summary = [...byCompany.entries()]
    .map(([companyId, e]) => ({
      companyId,
      ...e,
      lunchTotal: e.lunchCount * e.price,
      dinnerTotal: e.dinnerCount * e.price,
      totalCount: e.lunchCount + e.dinnerCount,
      totalAmount: (e.lunchCount + e.dinnerCount) * e.price,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));

  const markedDates = [...new Set(registrations.map((r) => r.mealDate.toISOString().slice(0, 10)))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">식수 정산</h1>
          <p className="mt-1 text-sm text-gray-600">외부업체 식사 등록 현황을 월 단위로 집계합니다.</p>
        </div>
        <Link
          href="/meal-settlement/companies"
          className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          업체 관리
        </Link>
      </div>

      <MonthCalendar
        basePath="/meal-settlement"
        month={month}
        markedDates={markedDates}
        legendLabel="식사 등록이 있는 날짜"
      />

      {summary.length === 0 ? (
        <div className="rounded-md border border-gray-200 bg-white p-8 text-center text-gray-500">
          이번 달에 등록된 식사가 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {summary.map((s) => (
            <Link 
              key={s.companyId} 
              href={`/meal-settlement/${s.companyId}?month=${month}`}
              className="block rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden hover:border-primary-500 hover:ring-1 hover:ring-primary-500 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3 group-hover:bg-primary-50/50 transition-colors">
                <h2 className="text-base font-bold text-gray-900">{s.name}</h2>
                <span className="text-sm font-medium text-primary-600 flex items-center gap-1">
                  상세내역 보기
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
              
              <div className="grid grid-cols-1 divide-y divide-gray-100 p-2">
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-gray-500 text-sm">중식 정산</span>
                  <span className="font-medium text-gray-900 text-sm">
                    {s.lunchCount}명 × {s.price.toLocaleString()}원 = <span className="font-semibold">{s.lunchTotal.toLocaleString()}원</span>
                  </span>
                </div>
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-gray-500 text-sm">석식 정산</span>
                  <span className="font-medium text-gray-900 text-sm">
                    {s.dinnerCount}명 × {s.price.toLocaleString()}원 = <span className="font-semibold">{s.dinnerTotal.toLocaleString()}원</span>
                  </span>
                </div>
                <div className="flex justify-between items-center px-4 py-3 bg-primary-50/30 rounded-b-md mt-1">
                  <span className="text-primary-800 text-sm font-bold">총 합계</span>
                  <span className="font-bold text-primary-900 text-base">
                    {s.totalCount}명 / {s.totalAmount.toLocaleString()}원
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
