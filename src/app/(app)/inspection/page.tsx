import Link from "next/link";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import InspectionNoticeModal from "@/components/inspection/InspectionNoticeModal";
import MonthCalendar from "@/components/common/MonthCalendar";
import { getMonthRange, parseMonthParam, parseDateParam } from "@/lib/month-range";
import NewInspectionForm from "@/components/inspection/NewInspectionForm";

export default async function InspectionPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; date?: string }>;
}) {
  const sp = await searchParams;
  const month = parseMonthParam(sp.month);
  const { start, end } = getMonthRange(month);
  const selectedDate = parseDateParam(sp.date);

  const session = await getSession();
  const restaurant = session!.restaurant;

  const logs = await db.inspectionLog.findMany({
    where: { restaurant, logDate: { gte: start, lte: end } },
    orderBy: { logDate: "desc" },
    include: { _count: { select: { rows: true } } },
  });

  // 임시저장/확정을 한 번도 누르지 않은(명시적 저장이 없는) 로그는 숨김
  const visibleMonthLogs = logs.filter(
    (l) => l.status === "CONFIRMED" || l.updatedAt.getTime() - l.createdAt.getTime() > 1000
  );

  const markedDates = visibleMonthLogs.map((l) => l.logDate.toISOString().slice(0, 10));
  const visibleLogs = selectedDate
    ? visibleMonthLogs.filter((l) => l.logDate.toISOString().slice(0, 10) === selectedDate)
    : visibleMonthLogs;

  return (
    <div className="space-y-6">
      <InspectionNoticeModal />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">식재료 검수일지</h1>
          <p className="mt-1 text-sm text-gray-600">입고일자를 선택해 검수일지를 작성하거나 확인합니다.</p>
        </div>
        <div className="flex gap-2">
          <NewInspectionForm />
          <Link
            href="/inspection/template"
            className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center"
          >
            양식 설정
          </Link>
        </div>
      </div>

      <MonthCalendar
        basePath="/inspection"
        month={month}
        markedDates={markedDates}
        legendLabel="작성된 검수일지가 있는 날짜"
        selectedDate={selectedDate ?? undefined}
      />

      <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500">
            <tr>
              <th className="px-4 py-2">입고일자</th>
              <th className="px-4 py-2">검수자</th>
              <th className="px-4 py-2">품목 수</th>
              <th className="px-4 py-2">상태</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibleLogs.map((log) => (
              <tr key={log.id}>
                <td className="px-4 py-2 text-gray-600">{log.logDate.toISOString().slice(0, 10)}</td>
                <td className="px-4 py-2 text-gray-600">{log.inspectorName ?? "-"}</td>
                <td className="px-4 py-2 text-gray-600">{log._count.rows}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      log.status === "CONFIRMED" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {log.status === "CONFIRMED" ? "확정" : "임시저장"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/inspection/${log.logDate.toISOString().slice(0, 10)}`}
                    className="text-primary-600 hover:underline"
                  >
                    열기
                  </Link>
                </td>
              </tr>
            ))}
            {visibleLogs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  {selectedDate ? "해당 날짜에 작성된 검수일지가 없습니다." : "이번 달에 작성된 검수일지가 없습니다."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
