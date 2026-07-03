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
    orderBy: { mealDate: "asc" },
  });

  const byCompany = new Map<string, { name: string; price: number; count: number }>();
  for (const r of registrations) {
    const entry = byCompany.get(r.companyId) ?? { name: r.company.name, price: r.company.pricePerMeal, count: 0 };
    entry.count += 1;
    byCompany.set(r.companyId, entry);
  }
  const summary = [...byCompany.entries()]
    .map(([companyId, e]) => ({ companyId, ...e, total: e.count * e.price }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  const grandTotal = summary.reduce((sum, s) => sum + s.total, 0);
  const grandCount = summary.reduce((sum, s) => sum + s.count, 0);

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

      <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500">
            <tr>
              <th className="px-4 py-2">업체명</th>
              <th className="px-4 py-2">인원수</th>
              <th className="px-4 py-2">단가</th>
              <th className="px-4 py-2">합계금액</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {summary.map((s) => (
              <tr key={s.companyId}>
                <td className="px-4 py-2 font-medium text-gray-900">{s.name}</td>
                <td className="px-4 py-2 text-gray-600">{s.count}</td>
                <td className="px-4 py-2 text-gray-600">{s.price.toLocaleString()}원</td>
                <td className="px-4 py-2 text-gray-600">{s.total.toLocaleString()}원</td>
                <td className="px-4 py-2 text-right">
                  <div className="flex justify-end gap-3">
                    <a
                      href={`/api/meal-settlement/export?companyId=${s.companyId}&month=${month}`}
                      className="text-primary-600 hover:underline"
                    >
                      엑셀
                    </a>
                    <Link href={`/meal-settlement/${s.companyId}?month=${month}`} className="text-primary-600 hover:underline">
                      상세
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {summary.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  이번 달에 등록된 식사가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
          {summary.length > 0 && (
            <tfoot>
              <tr className="border-t border-gray-200 bg-gray-50 font-medium text-gray-900">
                <td className="px-4 py-2">합계</td>
                <td className="px-4 py-2">{grandCount}</td>
                <td className="px-4 py-2" />
                <td className="px-4 py-2">{grandTotal.toLocaleString()}원</td>
                <td className="px-4 py-2" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
