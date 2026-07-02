import PrintButton from "./PrintButton";
import { formatReportIssueDate, type VendorReport } from "@/lib/vendor-report";

export default function VendorReportTable({
  vendorId,
  vendorName,
  categoryLabel,
  year,
  month,
  report,
}: {
  vendorId: string;
  vendorName: string;
  categoryLabel: string | null;
  year: number;
  month: number;
  report: VendorReport;
}) {
  const dateColumns = report.weeks.flatMap((w) => w.dates);
  const colSpanCount = dateColumns.length || 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-lg font-semibold text-gray-900">납품보고서 - {vendorName}</h1>
        <div className="flex gap-2">
          <PrintButton />
          <a
            href={`/api/reports/vendor-export?vendorId=${vendorId}&year=${year}&month=${month}`}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            엑셀로 내보내기
          </a>
        </div>
      </div>

      <div className="rounded-md border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">납품보고서</h2>
            <p className="mt-1 text-sm text-gray-600">
              업체명 : {vendorName}
              {categoryLabel ? `(${categoryLabel})` : ""}
            </p>
            <p className="text-sm text-gray-600">일자 : {formatReportIssueDate(year, month)}</p>
          </div>
          <table className="border-collapse text-center text-xs">
            <thead>
              <tr>
                <th className="border border-gray-400 px-4 py-1 font-medium" rowSpan={2}>
                  결재
                </th>
                <th className="border border-gray-400 px-4 py-1 font-medium">담당</th>
                <th className="border border-gray-400 px-4 py-1 font-medium">차장</th>
              </tr>
              <tr>
                <td className="border border-gray-400 px-4 py-4" />
                <td className="border border-gray-400 px-4 py-4" />
              </tr>
            </thead>
          </table>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-max border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50">
                <th rowSpan={2} className="border border-gray-300 px-2 py-1">
                  번호
                </th>
                <th rowSpan={2} className="border border-gray-300 px-2 py-1">
                  품명/규격
                </th>
                <th rowSpan={2} className="border border-gray-300 px-2 py-1">
                  단위
                </th>
                <th rowSpan={2} className="border border-gray-300 px-2 py-1">
                  수량
                </th>
                <th rowSpan={2} className="border border-gray-300 px-2 py-1">
                  단가
                </th>
                <th rowSpan={2} className="border border-gray-300 px-2 py-1">
                  금액
                </th>
                <th colSpan={colSpanCount} className="border border-gray-300 px-2 py-1">
                  납품현황
                </th>
              </tr>
              <tr className="bg-gray-50">
                {report.weeks.map((week) =>
                  week.dates.map((date, i) => (
                    <th key={date} className="border border-gray-300 px-1 py-1 font-normal">
                      {i === 0 ? (
                        <div className="flex flex-col">
                          <span className="font-medium">{week.label}</span>
                          <span>{date.slice(5)}</span>
                        </div>
                      ) : (
                        date.slice(5)
                      )}
                    </th>
                  ))
                )}
                {dateColumns.length === 0 && <th className="border border-gray-300 px-2 py-1">-</th>}
              </tr>
            </thead>
            <tbody>
              {report.items.map((item, index) => (
                <tr key={`${item.itemName}-${item.unit}`}>
                  <td className="border border-gray-300 px-2 py-1 text-center">{index + 1}</td>
                  <td className="border border-gray-300 px-2 py-1">{item.itemName}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{item.unit}</td>
                  <td className="border border-gray-300 px-2 py-1 text-right">
                    {item.totalQuantity.toLocaleString()}
                  </td>
                  <td
                    className={`border border-gray-300 px-2 py-1 text-right ${
                      item.priceVaries ? "font-semibold text-red-600" : ""
                    }`}
                    title={item.priceVaries ? "이 기간 중 단가가 달라졌습니다" : undefined}
                  >
                    {item.unitPrice.toLocaleString()}
                    {item.priceVaries && " ⚠"}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-right">
                    {item.totalAmount.toLocaleString()}
                  </td>
                  {dateColumns.map((date) => (
                    <td key={date} className="border border-gray-300 px-1 py-1 text-center">
                      {item.quantityByDate[date] ? item.quantityByDate[date].toLocaleString() : ""}
                    </td>
                  ))}
                </tr>
              ))}
              {report.items.length === 0 && (
                <tr>
                  <td
                    colSpan={6 + colSpanCount}
                    className="border border-gray-300 px-2 py-6 text-center text-gray-400"
                  >
                    해당 기간에 확정된 납품 내역이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
            {report.items.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={5} className="border-t-2 border-gray-800 px-2 py-1 text-right font-semibold">
                    합계
                  </td>
                  <td className="border-t-2 border-gray-800 px-2 py-1 text-right font-semibold">
                    {report.grandTotal.toLocaleString()}
                  </td>
                  {dateColumns.map((date) => (
                    <td key={date} className="border-t-2 border-gray-800" />
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
