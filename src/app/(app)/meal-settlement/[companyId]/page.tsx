import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getMonthRange, parseMonthParam } from "@/lib/month-range";
import { RESTAURANT_LABELS, type RestaurantCode } from "@/lib/restaurants";
import PrintButton from "@/components/reports/PrintButton";

export default async function MealCompanyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { companyId } = await params;
  const sp = await searchParams;
  const month = parseMonthParam(sp.month);
  const { start, end } = getMonthRange(month);

  const session = await getSession();
  const company = await db.mealCompany.findUnique({ where: { id: companyId } });
  if (!company) notFound();

  const registrations = await db.mealRegistration.findMany({
    where: { restaurant: session!.restaurant, companyId, mealDate: { gte: start, lte: end } },
    orderBy: [{ mealDate: "asc" }, { submittedAt: "asc" }],
  });

  const total = registrations.length * company.pricePerMeal;
  const [y, m] = month.split("-").map(Number);
  const titleText = `${company.name} 식수 정산 - ${y}년 ${m}월`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-lg font-semibold text-gray-900">{titleText}</h1>
        <div className="flex gap-2">
          <PrintButton />
          <a
            href={`/api/meal-settlement/export?companyId=${companyId}&month=${month}`}
            className="rounded bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            엑셀로 내보내기
          </a>
        </div>
      </div>
      <h1 className="hidden text-lg font-semibold text-gray-900 print:block">{titleText}</h1>

      <div className="flex gap-6 rounded-md border border-gray-200 bg-white p-4 text-sm">
        <p>
          <span className="text-gray-500">1식 단가 : </span>
          {company.pricePerMeal.toLocaleString()}원
        </p>
        <p>
          <span className="text-gray-500">인원수 : </span>
          {registrations.length}명
        </p>
        <p>
          <span className="text-gray-500">합계금액 : </span>
          {total.toLocaleString()}원
        </p>
      </div>

      <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500">
            <tr>
              <th className="px-4 py-2">번호</th>
              <th className="px-4 py-2">날짜</th>
              <th className="px-4 py-2">식당</th>
              <th className="px-4 py-2">이름</th>
              <th className="px-4 py-2">연락처</th>
              <th className="px-4 py-2">제출시각</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {registrations.map((r, i) => (
              <tr key={r.id}>
                <td className="px-4 py-2 text-gray-600">{i + 1}</td>
                <td className="px-4 py-2 text-gray-600">{r.mealDate.toISOString().slice(0, 10)}</td>
                <td className="px-4 py-2 text-gray-600">{RESTAURANT_LABELS[r.restaurant as RestaurantCode]}</td>
                <td className="px-4 py-2 text-gray-900">{r.submitterName}</td>
                <td className="px-4 py-2 text-gray-600">{r.phone}</td>
                <td className="px-4 py-2 text-gray-600">{r.submittedAt.toLocaleString("ko-KR")}</td>
              </tr>
            ))}
            {registrations.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  등록된 식사가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
