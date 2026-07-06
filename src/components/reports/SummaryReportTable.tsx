import Link from "next/link";
import PrintButton from "./PrintButton";
import { CATEGORY_LABELS } from "@/lib/categories";
import { TAX_TYPE_LABELS } from "@/lib/tax";
import type { VendorSummaryReport } from "@/lib/report-aggregate";

export default function SummaryReportTable({
  restaurantLabel,
  periodLabel,
  startStr,
  endStr,
  categoriesParam,
  report,
}: {
  restaurantLabel: string;
  periodLabel: string;
  startStr: string;
  endStr: string;
  categoriesParam?: string;
  report: VendorSummaryReport;
}) {
  const listHref = `/reports?start=${startStr}&end=${endStr}${categoriesParam ? `&categories=${encodeURIComponent(categoriesParam)}` : ""}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href={listHref}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ← 목록으로
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">전체 통합 요약 - {restaurantLabel}</h1>
        </div>
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

      <div className="rounded-md border border-gray-200 bg-white p-6 print:border-none print:p-0 print:shadow-none">
        <div className="mb-6">
          <h2 className="mb-8 text-center text-3xl font-bold tracking-[0.2em] text-gray-900 underline underline-offset-8">
            식재료 구입대금 지불
          </h2>
          <div className="flex items-end justify-between">
            <div className="space-y-2 text-base font-medium text-gray-800">
              <p>
                <span className="inline-block w-12 tracking-widest">식당</span>: &nbsp; {restaurantLabel}
              </p>
              <p>
                <span className="inline-block w-12 tracking-widest">기간</span>: &nbsp; {periodLabel}
              </p>
            </div>
            <table className="border-collapse text-center text-sm">
              <thead>
                <tr>
                  <th className="w-8 border border-gray-400 py-1 font-medium text-gray-700" rowSpan={3}>
                    결<br /><br />재
                  </th>
                  <th className="w-20 border border-gray-400 py-1 font-medium text-gray-700">담당</th>
                  <th className="w-20 border border-gray-400 py-1 font-medium text-gray-700">차장</th>
                  <th className="w-20 border border-gray-400 py-1 font-medium text-gray-700">부장</th>
                </tr>
                <tr>
                  <td className="h-16 border border-gray-400" />
                  <td className="h-16 border border-gray-400" />
                  <td className="h-16 border border-gray-400" />
                </tr>
                <tr>
                  <td className="border border-gray-400">
                    <input type="text" className="w-full bg-transparent py-1 text-center text-xs outline-none" />
                  </td>
                  <td className="border border-gray-400">
                    <input type="text" className="w-full bg-transparent py-1 text-center text-xs outline-none" />
                  </td>
                  <td className="border border-gray-400">
                    <input type="text" className="w-full bg-transparent py-1 text-center text-xs outline-none" />
                  </td>
                </tr>
              </thead>
            </table>
          </div>
        </div>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 px-2 py-1.5 text-left">업체명</th>
              <th className="border border-gray-300 px-2 py-1.5 text-right">공급가액</th>
              <th className="border border-gray-300 px-2 py-1.5 text-right">세액</th>
              <th className="border border-gray-300 px-2 py-1.5 text-right">합계금액</th>
              <th className="border border-gray-300 px-2 py-1.5 text-left">비고</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-2 py-1.5 font-medium text-gray-900">{row.vendorName}</td>
                <td className="border border-gray-300 px-2 py-1.5 text-right">{row.supplyAmount.toLocaleString()}</td>
                <td className="border border-gray-300 px-2 py-1.5 text-right">
                  {row.taxType === "TAXABLE" ? row.taxAmount.toLocaleString() : "-"}
                </td>
                <td className="border border-gray-300 px-2 py-1.5 text-right font-medium">
                  {(row.supplyAmount + row.taxAmount).toLocaleString()}
                </td>
                <td className="border border-gray-300 px-2 py-1.5 text-gray-600">
                  {CATEGORY_LABELS[row.category]}({TAX_TYPE_LABELS[row.taxType]})
                </td>
              </tr>
            ))}
            {report.rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-2 py-6 text-center text-gray-400">
                  해당 기간에 확정된 납품 내역이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
          {report.rows.length > 0 && (
            <tfoot>
              <tr>
                <td className="border-t-2 border-gray-600 px-2 py-1.5 text-right font-bold text-gray-700">계</td>
                <td className="border-t-2 border-gray-600 px-2 py-1.5 text-right font-bold">
                  {(report.taxableSupplyTotal + report.exemptSupplyTotal).toLocaleString()}
                </td>
                <td className="border-t-2 border-gray-600 px-2 py-1.5 text-right font-bold">
                  {report.taxableTaxTotal.toLocaleString()}
                </td>
                <td className="border-t-2 border-gray-600 px-2 py-1.5 text-right font-bold">
                  {report.grandTotal.toLocaleString()}
                </td>
                <td className="border-t-2 border-gray-600 px-2 py-1.5" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
