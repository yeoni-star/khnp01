import { CATEGORY_LABELS } from "@/lib/categories";
import type { WeeklyCategorySpendReport } from "@/lib/weekly-category-spend";

function formatMonthLabel(monthStr: string): string {
  const [, m] = monthStr.split("-");
  return `${parseInt(m, 10)}월`;
}

export default function WeeklyCategorySpendPanel({ report }: { report: WeeklyCategorySpendReport }) {
  const hasAnyData = report.rows.some((r) => r.lastMonthWeeklyAvg > 0 || r.thisMonthWeeklyAvg > 0);

  return (
    <div className="w-full rounded-md border border-gray-200 bg-white p-4">
      <h2 className="mb-1 text-sm font-semibold text-gray-900">카테고리별 주간 평균 사용 금액</h2>
      <p className="mb-3 text-xs text-gray-500">
        {formatMonthLabel(report.lastMonthLabel)} 전체 대비 {formatMonthLabel(report.thisMonthLabel)} 현재까지의 주간
        평균이에요.
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
                className="flex items-center justify-between gap-3 rounded border border-gray-100 px-3 py-2"
              >
                <span className="w-16 shrink-0 text-sm font-medium text-gray-800">
                  {CATEGORY_LABELS[row.category]}
                </span>
                <div className="flex flex-1 items-center justify-end gap-4 text-right">
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
    </div>
  );
}
