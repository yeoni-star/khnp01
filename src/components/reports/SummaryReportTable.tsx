import PrintButton from "./PrintButton";
import { CATEGORY_LABELS } from "@/lib/categories";
import { TAX_TYPE_LABELS } from "@/lib/tax";
import type { SummaryReport } from "@/lib/report-aggregate";

export default function SummaryReportTable({
  restaurantLabel,
  periodLabel,
  startStr,
  endStr,
  categoriesParam,
  report,
  selectedVendorCount = 0,
}: {
  restaurantLabel: string;
  periodLabel: string;
  startStr: string;
  endStr: string;
  categoriesParam?: string;
  report: SummaryReport;
  selectedVendorCount?: number;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-lg font-semibold text-gray-900">전체 통합 요약 - {restaurantLabel}</h1>
        <div className="flex gap-2">
          <PrintButton />
          <a
            href={`/api/reports/summary-export?start=${startStr}&end=${endStr}${categoriesParam ? `&categories=${encodeURIComponent(categoriesParam)}` : ""}`}
            className="rounded bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            엑셀로 내보내기
          </a>
        </div>
      </div>

      <div className="rounded-md border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">기간별 납품보고서 (전체 통합)</h2>
            <p className="mt-1 text-sm text-gray-600">{restaurantLabel}</p>
            <p className="text-sm text-gray-600">
              기간: {periodLabel}
            </p>
            {selectedVendorCount > 0 && (
              <p className="mt-1 text-xs text-primary-600 font-medium">
                ※ 선택된 업체 {selectedVendorCount}곳의 납품 내역만 집계됩니다.
              </p>
            )}
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
          <div key={taxSection.taxType} className="mb-6">
            <p className="mb-2 text-sm font-semibold text-gray-900">
              {TAX_TYPE_LABELS[taxSection.taxType]}
            </p>

            {taxSection.categories.map((section) => (
              <div key={section.category} className="mb-4">
                <p className="mb-1 rounded bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-700">
                  {CATEGORY_LABELS[section.category]}
                </p>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-2 py-1 text-left">품명</th>
                      <th className="border border-gray-300 px-2 py-1">단위</th>
                      <th className="border border-gray-300 px-2 py-1 text-left">업체명</th>
                      <th className="border border-gray-300 px-2 py-1 text-right">수량</th>
                      <th className="border border-gray-300 px-2 py-1 text-right">공급가액</th>
                      {taxSection.taxType === "TAXABLE" && (
                        <th className="border border-gray-300 px-2 py-1 text-right">세액</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {section.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-2 py-1">{item.itemName}</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">{item.unit}</td>
                        <td className="border border-gray-300 px-2 py-1 text-gray-600">
                          {item.vendorName || <span className="text-gray-300">-</span>}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-right">
                          {item.totalQuantity.toLocaleString()}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-right">
                          {item.totalAmount.toLocaleString()}
                        </td>
                        {taxSection.taxType === "TAXABLE" && (
                          <td className="border border-gray-300 px-2 py-1 text-right">
                            {item.totalTaxAmount.toLocaleString()}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td
                        colSpan={taxSection.taxType === "TAXABLE" ? 4 : 4}
                        className="border-t-2 border-gray-600 px-2 py-1 text-right font-bold text-gray-700"
                      >
                        {CATEGORY_LABELS[section.category]} 소계
                      </td>
                      <td className="border-t-2 border-gray-600 px-2 py-1 text-right font-bold">
                        {section.subtotal.toLocaleString()}
                      </td>
                      {taxSection.taxType === "TAXABLE" && (
                        <td className="border-t-2 border-gray-600 px-2 py-1 text-right font-bold">
                          {section.items.reduce((sum, i) => sum + i.totalTaxAmount, 0).toLocaleString()}
                        </td>
                      )}
                    </tr>
                  </tfoot>
                </table>
              </div>
            ))}

            {/* 과세/면세 소계 */}
            <div className="mt-1 flex justify-end">
              <p className="text-sm font-semibold text-gray-800">
                {TAX_TYPE_LABELS[taxSection.taxType]} 공급가액 소계:{" "}
                <span className="font-bold">{taxSection.supplySubtotal.toLocaleString()}원</span>
                {taxSection.taxType === "TAXABLE" && (
                  <>
                    {" "}· 세액 소계:{" "}
                    <span className="font-bold">{taxSection.taxSubtotal.toLocaleString()}원</span>
                  </>
                )}
              </p>
            </div>
          </div>
        ))}

        {report.taxSections.length === 0 && (
          <p className="px-2 py-6 text-center text-gray-400">해당 기간에 확정된 납품 내역이 없습니다.</p>
        )}

        {report.taxSections.length > 0 && (
          <div className="mt-4 border-t-2 border-gray-800 pt-3 text-right">
            <p className="text-sm font-bold text-gray-900">
              공급가액 합계: {(report.taxableSupplyTotal + report.exemptSupplyTotal).toLocaleString()}원
              &nbsp;·&nbsp; 세액 합계: {report.taxableTaxTotal.toLocaleString()}원
              &nbsp;·&nbsp; 총 합계: {report.grandTotal.toLocaleString()}원
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
