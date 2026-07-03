import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { RESTAURANT_LABELS, type RestaurantCode } from "@/lib/restaurants";
import { MEAL_TYPE_LABELS, type MealTypeCode } from "@/lib/meal";
import PrintButton from "@/components/reports/PrintButton";
import Link from "next/link";
import DateRangePicker from "@/components/common/DateRangePicker";

function getKstDateRange(startStr: string, endStr: string) {
  const start = new Date(`${startStr}T00:00:00+09:00`);
  const end = new Date(`${endStr}T23:59:59.999+09:00`);
  return { start, end };
}

export default async function MealCompanyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const { companyId } = await params;
  const sp = await searchParams;
  
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  
  const defaultStartStr = new Date(kstNow.getFullYear(), kstNow.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const defaultEndStr = new Date(kstNow.getFullYear(), kstNow.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);

  const startStr = sp.start || defaultStartStr;
  const endStr = sp.end || defaultEndStr;

  const { start, end } = getKstDateRange(startStr, endStr);

  const session = await getSession();
  const company = await db.mealCompany.findUnique({ where: { id: companyId } });
  if (!company) notFound();

  const registrations = await db.mealRegistration.findMany({
    where: { restaurant: session!.restaurant, companyId, mealDate: { gte: start, lte: end } },
    orderBy: [{ mealDate: "asc" }, { submittedAt: "asc" }],
  });

  let lunchCount = 0;
  let dinnerCount = 0;

  for (const r of registrations) {
    if (r.mealType === "LUNCH") lunchCount++;
    else dinnerCount++;
  }

  const price = company.pricePerMeal;
  const lunchTotal = lunchCount * price;
  const dinnerTotal = dinnerCount * price;
  const totalAmount = lunchTotal + dinnerTotal;
  const totalCount = lunchCount + dinnerCount;

  const titleText = `${company.name} 식수 정산 (${startStr} ~ ${endStr})`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 print:hidden">
        <Link href={`/meal-settlement?start=${startStr}&end=${endStr}`} className="text-gray-500 hover:text-gray-900">
          &larr; 목록으로
        </Link>
      </div>

      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-xl font-bold text-gray-900">{titleText}</h1>
        <div className="flex gap-2">
          <PrintButton />
          <a
            href={`/api/meal-settlement/export?companyId=${companyId}&start=${startStr}&end=${endStr}`}
            download={`meal_settlement_${startStr}_${endStr}.xlsx`}
            className="rounded bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
          >
            엑셀로 내보내기
          </a>
        </div>
      </div>
      <h1 className="hidden text-xl font-bold text-gray-900 print:block mb-4">{titleText}</h1>

      <div className="print:hidden">
        <DateRangePicker 
          basePath={`/meal-settlement/${companyId}`} 
          defaultStart={startStr} 
          defaultEnd={endStr} 
        />
      </div>

      <div className="grid grid-cols-1 divide-y divide-gray-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0 rounded-md border border-gray-200 bg-white shadow-sm">
        <div className="p-5 flex flex-col justify-center items-center">
          <span className="text-gray-500 text-sm mb-2">중식 정산</span>
          <span className="font-semibold text-gray-900 text-lg">
            {lunchCount}명 × {price.toLocaleString()}원 = {lunchTotal.toLocaleString()}원
          </span>
        </div>
        <div className="p-5 flex flex-col justify-center items-center">
          <span className="text-gray-500 text-sm mb-2">석식 정산</span>
          <span className="font-semibold text-gray-900 text-lg">
            {dinnerCount}명 × {price.toLocaleString()}원 = {dinnerTotal.toLocaleString()}원
          </span>
        </div>
        <div className="p-5 flex flex-col justify-center items-center bg-primary-50/50">
          <span className="text-primary-700 text-sm font-bold mb-2">총 합계</span>
          <span className="font-bold text-primary-900 text-2xl">
            {totalCount}명 / {totalAmount.toLocaleString()}원
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500">
            <tr>
              <th className="px-4 py-3 w-16 text-center">번호</th>
              <th className="px-4 py-3">날짜</th>
              <th className="px-4 py-3">구분 (중/석)</th>
              <th className="px-4 py-3">식당</th>
              <th className="px-4 py-3">이름</th>
              <th className="px-4 py-3">연락처</th>
              <th className="px-4 py-3">제출시각</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {registrations.map((r, i) => (
              <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-600 text-center">{i + 1}</td>
                <td className="px-4 py-3 text-gray-600">{r.mealDate.toISOString().slice(0, 10)}</td>
                <td className="px-4 py-3 text-gray-900 font-medium">
                  {MEAL_TYPE_LABELS[r.mealType as MealTypeCode] || r.mealType}
                </td>
                <td className="px-4 py-3 text-gray-600">{RESTAURANT_LABELS[r.restaurant as RestaurantCode]}</td>
                <td className="px-4 py-3 text-gray-900">{r.submitterName}</td>
                <td className="px-4 py-3 text-gray-600">{r.phone}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {r.submittedAt.toLocaleString("ko-KR", { 
                    year: 'numeric', month: '2-digit', day: '2-digit', 
                    hour: '2-digit', minute:'2-digit', second:'2-digit' 
                  })}
                </td>
              </tr>
            ))}
            {registrations.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  해당 기간에 등록된 식사가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
