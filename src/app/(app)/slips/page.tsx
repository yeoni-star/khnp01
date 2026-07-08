import Link from "next/link";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { TAX_TYPE_LABELS } from "@/lib/tax";
import CopySlipButton from "@/components/slips/CopySlipButton";
import MonthCalendar from "@/components/common/MonthCalendar";
import { getMonthRange, parseMonthParam, parseDateParam, todayStr } from "@/lib/month-range";

export default async function SlipsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; date?: string }>;
}) {
  const sp = await searchParams;
  const month = parseMonthParam(sp.month);
  const { start, end } = getMonthRange(month);
  // 처음 진입(월/날짜 파라미터가 전혀 없을 때)은 오늘 날짜만 기본으로 보여준다.
  const selectedDate = parseDateParam(sp.date) ?? (sp.month === undefined && sp.date === undefined ? todayStr() : null);

  const session = await getSession();
  const monthSlips = await db.deliverySlip.findMany({
    where: { restaurant: session!.restaurant, deliveryDate: { gte: start, lte: end } },
    orderBy: { deliveryDate: "desc" },
    include: { vendor: true, items: true },
  });

  // 새 거래명세표 버튼만 누르고 저장을 안 한(품목이 없는 임시저장) 내역은 숨김
  const visibleMonthSlips = monthSlips.filter((s) => s.status === "CONFIRMED" || s.items.length > 0);
  const markedDates = [...new Set(visibleMonthSlips.map((s) => s.deliveryDate.toISOString().slice(0, 10)))];
  const visibleSlips = selectedDate
    ? visibleMonthSlips.filter((s) => s.deliveryDate.toISOString().slice(0, 10) === selectedDate)
    : visibleMonthSlips;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">거래명세표</h1>
          <p className="mt-1 text-sm text-gray-600">일별 거래명세표를 입력하고 관리합니다.</p>
        </div>
        <Link
          href="/slips/new"
          className="rounded bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
        >
          새 거래명세표
        </Link>
      </div>

      <MonthCalendar
        basePath="/slips"
        month={month}
        markedDates={markedDates}
        legendLabel="거래명세표가 있는 날짜"
        selectedDate={selectedDate ?? undefined}
      />

      <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500">
            <tr>
              <th className="px-4 py-2">납품일자</th>
              <th className="px-4 py-2">업체</th>
              <th className="px-4 py-2">면세/과세</th>
              <th className="px-4 py-2">품목 수</th>
              <th className="px-4 py-2">합계금액</th>
              <th className="px-4 py-2">상태</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibleSlips.map((s) => {
              const total = s.items.reduce((sum, i) => sum + i.amount, 0);
              return (
                <tr key={s.id}>
                  <td className="px-4 py-2 text-gray-600">{s.deliveryDate.toISOString().slice(0, 10)}</td>
                  <td className="px-4 py-2 font-medium text-gray-900">{s.vendor.name}</td>
                  <td className="px-4 py-2 text-gray-600">{TAX_TYPE_LABELS[s.taxType]}</td>
                  <td className="px-4 py-2 text-gray-600">{s.items.length}</td>
                  <td className="px-4 py-2 text-gray-600">{total.toLocaleString()}원</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        s.status === "CONFIRMED" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {s.status === "CONFIRMED" ? "확정" : "임시저장"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-3">
                      <CopySlipButton slipId={s.id} />
                      <Link href={`/slips/${s.id}`} className="text-primary-600 hover:underline">
                        상세
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            {visibleSlips.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  {selectedDate ? "해당 날짜에 등록된 거래명세표가 없습니다." : "이번 달에 등록된 거래명세표가 없습니다."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
