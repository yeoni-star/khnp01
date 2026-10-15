import { CATEGORY_LABELS } from "@/lib/categories";
import type { WeeklyCategorySpendReport } from "@/lib/weekly-category-spend";

function formatMonthLabel(monthStr: string): string {
  const [, m] = monthStr.split("-");
  return `${parseInt(m, 10)}월`;
}

export default function WeeklyCategorySpendPanel({ report }: { report: WeeklyCategorySpendReport }) {
  const hasAnyData = report.rows.some((r) => r.lastMonthWeeklyAvg > 0 || r.thisMonthWeeklyAvg > 0);
  const lowSample = report.thisMonthDaysElapsed < 7;

  return (
    <details className="group w-full rounded-md border border-gray-200 bg-white p-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
        <h2 className="text-sm font-semibold text-gray-900">카테고리별 주간 평균 사용 금액</h2>
        <span className="flex shrink-0 items-center gap-1 text-xs text-gray-500">
          <span className="group-open:hidden">펼치기</span>
          <span className="hidden group-open:inline">접기</span>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-4 w-4 transition-transform group-open:rotate-180"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </summary>
      <p className="mb-3 mt-3 text-xs text-gray-500">
        각 달의 확정 금액을 경과일수 ÷ 7로 나눠 하루 평균 사용 페이스를 1주 단위로 환산한 값이에요. 그래서{" "}
        {formatMonthLabel(report.lastMonthLabel)} 전체와 {formatMonthLabel(report.thisMonthLabel)}{" "}
        {report.thisMonthDaysElapsed}일치를 공평하게 비교할 수 있어요.
        {lowSample && (
          <span className="ml-1 font-medium text-amber-600">
            ⚠ {formatMonthLabel(report.thisMonthLabel)}은 아직 {report.thisMonthDaysElapsed}일치라 수치가 튈 수
            있어요.
          </span>
        )}
      </p>

      {!hasAnyData ? (
        <p className="py-6 text-center text-sm text-gray-400">확정된 거래명세표 데이터가 아직 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {report.rows.map((row) => {
            const diff = row.thisMonthWeeklyAvg - row.lastMonthWeeklyAvg;
            const diffPct =
              row.lastMonthWeeklyAvg > 0 ? Math.round((diff / row.lastMonthWeeklyAvg) * 100) : null;
            return (
              <div
                key={row.category}
                className="flex items-center justify-between gap-3 rounded border border-gray-100 px-3 py-2 mobile:flex-col mobile:items-stretch mobile:gap-1"
              >
                <span className="w-16 shrink-0 text-sm font-medium text-gray-800">
                  {CATEGORY_LABELS[row.category]}
                </span>
                <div className="flex flex-1 items-center justify-end gap-4 text-right mobile:justify-between mobile:gap-2">
                  <div>
                    <p className="text-[11px] text-gray-400">{formatMonthLabel(report.lastMonthLabel)} 주평균</p>
                    <p className="text-sm text-gray-600">{row.lastMonthWeeklyAvg.toLocaleString()}원</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-400">{formatMonthLabel(report.thisMonthLabel)} 주평균</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {row.thisMonthWeeklyAvg.toLocaleString()}원
                    </p>
                  </div>
                  <span
                    className={`w-16 shrink-0 text-xs font-medium ${
                      diffPct === null
                        ? "text-gray-300"
                        : diffPct > 0
                        ? "text-red-600"
                        : diffPct < 0
                        ? "text-blue-600"
                        : "text-gray-400"
                    }`}
                  >
                    {diffPct === null ? "-" : `${diffPct > 0 ? "+" : ""}${diffPct}%`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </details>
  );
}
