import Link from "next/link";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getMonthRange, parseMonthParam } from "@/lib/month-range";
import MonthCalendar from "@/components/common/MonthCalendar";
import { MEAL_TYPE_LABELS, type MealTypeCode } from "@/lib/meal";

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
    orderBy: [{ mealDate: "asc" }, { submittedAt: "asc" }],
  });

  const byCompany = new Map<
    string,
    {
      name: string;
      price: number;
      lunchCount: number;
      dinnerCount: number;
      registrations: typeof registrations;
    }
  >();

  for (const r of registrations) {
    const entry = byCompany.get(r.companyId) ?? {
      name: r.company.name,
      price: r.company.pricePerMeal,
      lunchCount: 0,
      dinnerCount: 0,
      registrations: [],
    };
    if (r.mealType === "LUNCH") entry.lunchCount += 1;
    else entry.dinnerCount += 1;
    entry.registrations.push(r);
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
        <div className="space-y-8">
          {summary.map((s) => (
            <div key={s.companyId} className="rounded-md border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
                <h2 className="text-base font-bold text-gray-900">{s.name}</h2>
                <div className="flex gap-2">
                  <a
                    href={`/api/meal-settlement/export?companyId=${s.companyId}&month=${month}`}
                    className="text-sm font-medium text-primary-600 hover:underline"
                  >
                    엑셀 다운로드
                  </a>
                </div>
              </div>
              
              <div className="grid grid-cols-1 divide-y divide-gray-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0 text-sm">
                <div className="p-4 flex flex-col justify-center items-center">
                  <span className="text-gray-500 text-xs mb-1">중식 정산</span>
                  <span className="font-semibold text-gray-900">
                    {s.lunchCount}명 × {s.price.toLocaleString()}원 = {s.lunchTotal.toLocaleString()}원
                  </span>
                </div>
                <div className="p-4 flex flex-col justify-center items-center">
                  <span className="text-gray-500 text-xs mb-1">석식 정산</span>
                  <span className="font-semibold text-gray-900">
                    {s.dinnerCount}명 × {s.price.toLocaleString()}원 = {s.dinnerTotal.toLocaleString()}원
                  </span>
                </div>
                <div className="p-4 flex flex-col justify-center items-center bg-primary-50/50">
                  <span className="text-primary-700 text-xs font-bold mb-1">총 합계</span>
                  <span className="font-bold text-primary-900 text-lg">
                    {s.totalCount}명 / {s.totalAmount.toLocaleString()}원
                  </span>
                </div>
              </div>

              <div className="border-t border-gray-200 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500">
                    <tr>
                      <th className="px-4 py-2 w-16 text-center">번호</th>
                      <th className="px-4 py-2">날짜</th>
                      <th className="px-4 py-2">구분 (중/석)</th>
                      <th className="px-4 py-2">이름</th>
                      <th className="px-4 py-2">연락처</th>
                      <th className="px-4 py-2">제출시각</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {s.registrations.map((r, i) => (
                      <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2 text-gray-600 text-center">{i + 1}</td>
                        <td className="px-4 py-2 text-gray-600">{r.mealDate.toISOString().slice(0, 10)}</td>
                        <td className="px-4 py-2 text-gray-900 font-medium">
                          {MEAL_TYPE_LABELS[r.mealType as MealTypeCode] || r.mealType}
                        </td>
                        <td className="px-4 py-2 text-gray-900">{r.submitterName}</td>
                        <td className="px-4 py-2 text-gray-600">{r.phone}</td>
                        <td className="px-4 py-2 text-gray-500 text-xs">
                          {r.submittedAt.toLocaleString("ko-KR", { 
                            year: 'numeric', month: '2-digit', day: '2-digit', 
                            hour: '2-digit', minute:'2-digit', second:'2-digit' 
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
