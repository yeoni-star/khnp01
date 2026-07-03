import PrintButton from "./PrintButton";
import { CATEGORY_LABELS } from "@/lib/categories";
import { TAX_TYPE_LABELS } from "@/lib/tax";
import type { SummaryReport } from "@/lib/report-aggregate";

export default function SummaryReportTable({
  restaurantLabel,
  year,
  month,
  report,
}: {
  restaurantLabel: string;
  year: number;
  month: number;
  report: SummaryReport;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-lg font-semibold text-gray-900">전체 통합 요약 - {restaurantLabel}</h1>
        <div className="flex gap-2">
          <PrintButton />
          <a
            href={`/api/reports/summary-export?year=${year}&month=${month}`}
            className="rounded bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            엑셀로 내보내기
          </a>
        </div>
      </div>

      <div className="rounded-md border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">월별 납품보고서 (전체 통합)</h2>
            <p className="mt-1 text-sm text-gray-600">{restaurantLabel}</p>
            <p className="text-sm text-gray-600">
              기간: {year}년 {month}월
            </p>
          </div>
          <table className="border-collapse text-center text-xs">
            <thead>
              <tr>
                <th className="border border-gray-400 px-3 py-1 font-medium" rowSpan={2}>
                  결재
                </th>
                <th className="border border-gray-400 px-3 py-1 font-medium">담당</th>
                <th className="border border-gray-400 px-3 py-1 font-medium">차장</th>
                <th className="border border-gray-400 px-3 py-1 font-medium">부장</th>
              </tr>
              <tr>
                <td className="border border-gray-400 px-3 py-4" />
                <td className="border border-gray-400 px-3 py-4" />
                <td className="border border-gray-400 px-3 py-4" />
              </tr>
            </thead>
          </table>
        </div>

        {report.taxSections.map((taxSection) => (
          <div key={taxSection.taxType} className="mb-4">
            <p className="mb-1 text-sm font-semibold text-gray-900">{TAX_TYPE_LABELS[taxSection.taxType]}</p>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-2 py-1">카테고리</th>
                  <th className="border border-gray-300 px-2 py-1">공급가액</th>
                  {taxSection.taxType === "TAXABLE" && <th className="border border-gray-300 px-2 py-1">세액</th>}
                </tr>
              </thead>
              <tbody>
                {taxSection.categories.map((section) => (
                  <tr key={section.category}>
                    <td className="border border-gray-300 px-2 py-1 font-medium">
                      {CATEGORY_LABELS[section.category]}
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-right">
                      {section.subtotal.toLocaleString()}
                    </td>
                    {taxSection.taxType === "TAXABLE" && (
                      <td className="border border-gray-300 px-2 py-1 text-right">
                        {section.items.reduce((sum, i) => sum + i.totalTaxAmount, 0).toLocaleString()}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="border-t-2 border-gray-800 px-2 py-1 text-right font-bold">
                    {TAX_TYPE_LABELS[taxSection.taxType]} 소계
                  </td>
                  <td className="border-t-2 border-gray-800 px-2 py-1 text-right font-bold">
                    {taxSection.supplySubtotal.toLocaleString()}
                  </td>
                  {taxSection.taxType === "TAXABLE" && (
                    <td className="border-t-2 border-gray-800 px-2 py-1 text-right font-bold">
                      {taxSection.taxSubtotal.toLocaleString()}
                    </td>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        ))}

        {report.taxSections.length === 0 && (
          <p className="px-2 py-6 text-center text-gray-400">해당 월에 확정된 납품 내역이 없습니다.</p>
        )}

        {report.taxSections.length > 0 && (
          <p className="text-right text-sm font-medium text-gray-900">
            공급가액 합계: {(report.taxableSupplyTotal + report.exemptSupplyTotal).toLocaleString()}원 · 세액 합계:{" "}
            {report.taxableTaxTotal.toLocaleString()}원 · 총 합계: {report.grandTotal.toLocaleString()}원
          </p>
        )}
      </div>
    </div>
  );
}
