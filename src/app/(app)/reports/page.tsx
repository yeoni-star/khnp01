import Link from "next/link";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/categories";

function currentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const { year: defaultYear, month: defaultMonth } = currentYearMonth();
  const year = Number(params.year) || defaultYear;
  const month = Number(params.month) || defaultMonth;

  const session = await getSession();
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const vendorsWithSlips = await db.vendor.findMany({
    where: {
      deliverySlips: {
        some: {
          restaurant: session!.restaurant,
          status: "CONFIRMED",
          deliveryDate: { gte: monthStart, lte: monthEnd },
        },
      },
    },
    include: {
      contracts: { orderBy: { startDate: "desc" }, take: 1, select: { category: true } },
    },
    orderBy: { name: "asc" },
  });

  const vendorsByCategory = new Map<string, typeof vendorsWithSlips>();
  const uncategorized: typeof vendorsWithSlips = [];
  for (const vendor of vendorsWithSlips) {
    const category = vendor.contracts[0]?.category;
    if (!category) {
      uncategorized.push(vendor);
      continue;
    }
    const arr = vendorsByCategory.get(category) ?? [];
    arr.push(vendor);
    vendorsByCategory.set(category, arr);
  }

  const yearOptions = Array.from({ length: 5 }, (_, i) => defaultYear - 2 + i);
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">월별 납품보고서</h1>
        <p className="mt-1 text-sm text-gray-600">업체별 상세 보고서 또는 전체 통합 요약을 확인합니다.</p>
      </div>

      <form method="get" className="flex items-end gap-3 rounded-md border border-gray-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">년도</label>
          <select name="year" defaultValue={year} className="rounded border border-gray-300 px-2 py-1.5 text-sm">
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">월</label>
          <select name="month" defaultValue={month} className="rounded border border-gray-300 px-2 py-1.5 text-sm">
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {m}월
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded bg-primary-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
        >
          조회
        </button>
      </form>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">
          {year}년 {month}월 - 업체별 보고서
        </h2>
        <Link
          href={`/reports/summary/${year}/${month}`}
          className="rounded border border-primary-300 px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-50"
        >
          전체 통합 요약 보기
        </Link>
      </div>

      {vendorsWithSlips.length === 0 ? (
        <div className="rounded-md border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-400">
          해당 월에 확정된 거래명세표가 없습니다.
        </div>
      ) : (
        <div className="space-y-4">
          {CATEGORIES.map((category) => {
            const vendors = vendorsByCategory.get(category);
            if (!vendors || vendors.length === 0) return null;
            return (
              <div key={category} className="overflow-hidden rounded-md border border-gray-200 bg-white">
                <div className="bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-900">
                  {CATEGORY_LABELS[category]}
                </div>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-100">
                    {vendors.map((v) => (
                      <tr key={v.id}>
                        <td className="px-4 py-2 font-medium text-gray-900">{v.name}</td>
                        <td className="px-4 py-2 text-right">
                          <Link
                            href={`/reports/vendor/${v.id}/${year}/${month}`}
                            className="text-primary-600 hover:underline"
                          >
                            보고서 보기
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
          {uncategorized.length > 0 && (
            <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
              <div className="bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-900">미분류</div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  {uncategorized.map((v) => (
                    <tr key={v.id}>
                      <td className="px-4 py-2 font-medium text-gray-900">{v.name}</td>
                      <td className="px-4 py-2 text-right">
                        <Link
                          href={`/reports/vendor/${v.id}/${year}/${month}`}
                          className="text-primary-600 hover:underline"
                        >
                          보고서 보기
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
