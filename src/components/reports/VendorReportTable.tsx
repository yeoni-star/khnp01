"use client";

import { useState } from "react";
import PrintButton from "./PrintButton";
import type { VendorReport } from "@/lib/vendor-report";

function formatReportIssueDate(year: number, month: number): string {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${String(year).slice(-2)}.${month}.${lastDay}`;
}

const WIDTH_STEP = 8;
const MIN_COL_WIDTH = 24;

type FixedColumn = "no" | "name" | "unit" | "qty" | "price" | "amount";

const DEFAULT_COL_WIDTHS: Record<FixedColumn, number> = {
  no: 48,
  name: 180,
  unit: 48,
  qty: 48,
  price: 80,
  amount: 96,
};

function ColumnHeaderLabel({
  label,
  onDecrease,
  onIncrease,
}: {
  label: string;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-1">
      <span>{label}</span>
      <div className="flex items-center gap-0.5 print:hidden">
        <button
          type="button"
          onClick={onDecrease}
          className="flex h-4 w-4 items-center justify-center rounded bg-gray-200 text-xs text-gray-600 hover:bg-gray-300"
        >
          -
        </button>
        <button
          type="button"
          onClick={onIncrease}
          className="flex h-4 w-4 items-center justify-center rounded bg-gray-200 text-xs text-gray-600 hover:bg-gray-300"
        >
          +
        </button>
      </div>
    </div>
  );
}

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
  const [emptyRowCount, setEmptyRowCount] = useState(0);
  const [reviewer1, setReviewer1] = useState("");
  const [reviewer2, setReviewer2] = useState("");
  const [colWidths, setColWidths] = useState<Record<FixedColumn, number>>(DEFAULT_COL_WIDTHS);
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({});

  function adjustWidth(col: FixedColumn, delta: number) {
    setColWidths((prev) => ({
      ...prev,
      [col]: Math.max(MIN_COL_WIDTH, (prev[col] ?? DEFAULT_COL_WIDTHS[col]) + delta),
    }));
  }

  // 4주치 고정 양식을 위해 week를 패딩
  const paddedWeeks = [...report.weeks];
  while (paddedWeeks.length < 4) {
    paddedWeeks.push({ label: `${paddedWeeks.length + 1}주`, dates: [] });
  }

  const displayWeeks = paddedWeeks.map((week) => {
    const actualCount = week.dates.length;
    const defaultVisible = Math.max(3, actualCount);
    const visibleCount = visibleCounts[week.label] !== undefined ? visibleCounts[week.label] : defaultVisible;

    const dates = week.dates.slice(0, visibleCount);
    while (dates.length < visibleCount) {
      dates.push(`empty-${week.label}-${dates.length}`);
    }
    return { ...week, dates, actualCount };
  });

  function handleAddCol(label: string, actualCount: number) {
    setVisibleCounts((prev) => {
      const current = prev[label] !== undefined ? prev[label] : Math.max(3, actualCount);
      return { ...prev, [label]: current + 1 };
    });
  }

  function handleRemoveCol(label: string, actualCount: number) {
    setVisibleCounts((prev) => {
      const current = prev[label] !== undefined ? prev[label] : Math.max(3, actualCount);
      return { ...prev, [label]: Math.max(0, current - 1) };
    });
  }

  const dateColumns = displayWeeks.flatMap((w) => w.dates);
  const colSpanCount = dateColumns.length || 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <h1 className="text-lg font-semibold text-gray-900">납품보고서 - {vendorName}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {displayWeeks.map((week) => (
            <div
              key={week.label}
              className="flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-700"
            >
              <span>{week.label}</span>
              <button
                type="button"
                onClick={() => handleRemoveCol(week.label, week.actualCount)}
                className="flex h-4 w-4 items-center justify-center rounded bg-gray-200 text-xs text-gray-600 hover:bg-gray-300"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => handleAddCol(week.label, week.actualCount)}
                className="flex h-4 w-4 items-center justify-center rounded bg-gray-200 text-xs text-gray-600 hover:bg-gray-300"
              >
                +
              </button>
            </div>
          ))}
          <button
            onClick={() => setEmptyRowCount(emptyRowCount + 5)}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            + 5칸 추가
          </button>
          <button
            onClick={() => setEmptyRowCount(emptyRowCount + 10)}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            + 10칸 추가
          </button>
          <PrintButton />
          <a
            href={`/api/reports/vendor-export?vendorId=${vendorId}&year=${year}&month=${month}`}
            className="rounded bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            엑셀로 내보내기
          </a>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[210mm] bg-white p-8 print:p-0">
        <div className="mb-4">
          <h2 className="mb-8 text-center text-4xl font-bold tracking-[0.3em] text-gray-900 underline underline-offset-8">
            납품보고서
          </h2>
          <div className="flex items-end justify-between">
            <div className="space-y-4 text-base text-gray-800">
              <p>
                <span className="inline-block w-20 tracking-[0.5em]">업체명</span>: &nbsp; {vendorName}
                {categoryLabel ? `(${categoryLabel})` : ""}
              </p>
              <p>
                <span className="inline-block w-20 tracking-[0.5em]">일자</span>: &nbsp; {formatReportIssueDate(year, month)}
              </p>
            </div>
            <table className="border-collapse text-center text-xs">
              <thead>
                <tr>
                  <th className="w-8 border border-gray-400 py-1 font-medium text-gray-700" rowSpan={3}>
                    결<br />
                    <br />
                    재
                  </th>
                  <th className="w-24 border border-gray-400 py-1 font-medium text-gray-700">담당</th>
                  <th className="w-24 border border-gray-400 py-1 font-medium text-gray-700">차장</th>
                </tr>
                <tr>
                  <td className="h-16 border border-gray-400" />
                  <td className="h-16 border border-gray-400" />
                </tr>
                <tr>
                  <td className="border border-gray-400">
                    <input
                      type="text"
                      className="w-full bg-transparent py-1 text-center text-xs outline-none"
                      value={reviewer1}
                      onChange={(e) => setReviewer1(e.target.value)}
                    />
                  </td>
                  <td className="border border-gray-400">
                    <input
                      type="text"
                      className="w-full bg-transparent py-1 text-center text-xs outline-none"
                      value={reviewer2}
                      onChange={(e) => setReviewer2(e.target.value)}
                    />
                  </td>
                </tr>
              </thead>
            </table>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-max border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 text-center">
                <th rowSpan={3} className="border border-gray-400 px-1 py-1" style={{ width: colWidths.no }}>
                  <ColumnHeaderLabel
                    label="번호"
                    onDecrease={() => adjustWidth("no", -WIDTH_STEP)}
                    onIncrease={() => adjustWidth("no", WIDTH_STEP)}
                  />
                </th>
                <th rowSpan={3} className="border border-gray-400 px-2 py-1" style={{ width: colWidths.name }}>
                  <ColumnHeaderLabel
                    label="품명/규격"
                    onDecrease={() => adjustWidth("name", -WIDTH_STEP)}
                    onIncrease={() => adjustWidth("name", WIDTH_STEP)}
                  />
                </th>
                <th rowSpan={3} className="border border-gray-400 px-1 py-1" style={{ width: colWidths.unit }}>
                  <ColumnHeaderLabel
                    label="단위"
                    onDecrease={() => adjustWidth("unit", -WIDTH_STEP)}
                    onIncrease={() => adjustWidth("unit", WIDTH_STEP)}
                  />
                </th>
                <th rowSpan={3} className="border border-gray-400 px-1 py-1" style={{ width: colWidths.qty }}>
                  <ColumnHeaderLabel
                    label="수량"
                    onDecrease={() => adjustWidth("qty", -WIDTH_STEP)}
                    onIncrease={() => adjustWidth("qty", WIDTH_STEP)}
                  />
                </th>
                <th rowSpan={3} className="border border-gray-400 px-1 py-1" style={{ width: colWidths.price }}>
                  <ColumnHeaderLabel
                    label="단가"
                    onDecrease={() => adjustWidth("price", -WIDTH_STEP)}
                    onIncrease={() => adjustWidth("price", WIDTH_STEP)}
                  />
                </th>
                <th rowSpan={3} className="border border-gray-400 px-1 py-1" style={{ width: colWidths.amount }}>
                  <ColumnHeaderLabel
                    label="금액"
                    onDecrease={() => adjustWidth("amount", -WIDTH_STEP)}
                    onIncrease={() => adjustWidth("amount", WIDTH_STEP)}
                  />
                </th>
                <th colSpan={colSpanCount} className="border border-gray-400 px-2 py-1">
                  납품현황
                </th>
              </tr>
              <tr className="bg-gray-50 text-center">
                {displayWeeks
                  .filter((week) => week.dates.length > 0)
                  .map((week) => (
                    <th key={week.label} colSpan={week.dates.length} className="border border-gray-400 px-1 py-1 font-medium">
                      {week.label}
                    </th>
                  ))}
                {dateColumns.length === 0 && <th className="border border-gray-400 px-2 py-1">-</th>}
              </tr>
              <tr className="bg-gray-50 text-center">
                {displayWeeks.map((week) =>
                  week.dates.map((date) => {
                    if (date.startsWith("empty-")) {
                      return <th key={date} className="min-w-[32px] border border-gray-400 px-1 py-1 text-[10px] font-normal tracking-tighter" />;
                    }
                    const [, m, d] = date.split("-");
                    return (
                      <th key={date} className="min-w-[32px] border border-gray-400 px-1 py-1 text-[10px] font-normal tracking-tighter">
                        {parseInt(m, 10)}/{parseInt(d, 10)}
                      </th>
                    );
                  })
                )}
                {dateColumns.length === 0 && <th className="border border-gray-400 px-2 py-1">-</th>}
              </tr>
            </thead>
            <tbody>
              {report.items.map((item, index) => (
                <tr key={`${item.itemName}-${item.unit}`}>
                  <td className="border border-gray-400 px-1 py-1 text-center">{index + 1}</td>
                  <td className="border border-gray-400 px-2 py-1">{item.itemName}</td>
                  <td className="border border-gray-400 px-1 py-1 text-center">{item.unit}</td>
                  <td className="border border-gray-400 px-2 py-1 text-right">
                    {item.totalQuantity.toLocaleString()}
                  </td>
                  <td
                    className={`border border-gray-400 px-2 py-1 text-right ${
                      item.priceVaries ? "font-semibold text-red-600" : ""
                    }`}
                    title={item.priceVaries ? "이 기간 중 단가가 달라졌습니다" : undefined}
                  >
                    {item.unitPrice.toLocaleString()}
                    {item.priceVaries && " ⚠"}
                  </td>
                  <td className="border border-gray-400 px-2 py-1 text-right">
                    {item.totalAmount.toLocaleString()}
                  </td>
                  {dateColumns.map((date) => (
                    <td key={date} className="border border-gray-400 px-1 py-1 text-center">
                      {!date.startsWith("empty-") && item.quantityByDate[date]
                        ? item.quantityByDate[date].toLocaleString()
                        : ""}
                    </td>
                  ))}
                </tr>
              ))}
              {report.items.length === 0 && emptyRowCount === 0 && (
                <tr>
                  <td
                    colSpan={6 + colSpanCount}
                    className="border border-gray-400 px-2 py-6 text-center text-gray-400"
                  >
                    해당 기간에 확정된 납품 내역이 없습니다.
                  </td>
                </tr>
              )}
              {Array.from({ length: emptyRowCount }).map((_, i) => (
                <tr key={`empty-${i}`}>
                  <td className="border border-gray-400 px-1 py-4 text-center"></td>
                  <td className="border border-gray-400 px-2 py-4"></td>
                  <td className="border border-gray-400 px-1 py-4 text-center"></td>
                  <td className="border border-gray-400 px-2 py-4 text-right"></td>
                  <td className="border border-gray-400 px-2 py-4 text-right"></td>
                  <td className="border border-gray-400 px-2 py-4 text-right"></td>
                  {dateColumns.map((date) => (
                    <td key={`empty-${i}-${date}`} className="border border-gray-400 px-1 py-4 text-center"></td>
                  ))}
                </tr>
              ))}
            </tbody>
            {report.items.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={5} className="border border-gray-400 bg-gray-50 px-2 py-1 text-center font-semibold tracking-widest">
                    합계
                  </td>
                  <td className="border border-gray-400 px-2 py-1 text-right font-semibold">
                    {report.grandTotal.toLocaleString()}
                  </td>
                  {dateColumns.map((date) => (
                    <td key={date} className="border border-gray-400" />
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
