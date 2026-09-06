"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import PrintButton from "./PrintButton";
import type { VendorReport, VendorReportItemRow } from "@/lib/vendor-report";
import { TAX_TYPE_LABELS } from "@/lib/tax";

const WIDTH_STEP = 8;
const MIN_COL_WIDTH = 24;
const FONT_SIZE_STEP = 1;
const MIN_FONT_SIZE = 6;
const MAX_FONT_SIZE = 14;
const DEFAULT_FONT_SIZE = 12;

const DATE_COL_WIDTH_STEP = 4;
const MIN_DATE_COL_WIDTH = 14;
const DEFAULT_DATE_COL_WIDTH = 32;

// A4 실제 인쇄 가능 폭(페이지 폭 - 좌우 여백, globals.css @page margin 12mm과 맞춤) 을 CSS px로 환산.
// 약간의 안전 여백(SAFETY_MARGIN_PX)만 남겨둔다 - 칸너비 조절(+/-) 버튼은 인쇄 시 사라지므로
// 화면에서 보이는 폭보다 실제 인쇄 폭이 더 좁게 나온다는 점은 감안할 필요 없음.
const MM_TO_PX = 96 / 25.4;
const PAGE_MARGIN_MM = 12;
const SAFETY_MARGIN_PX = 90;
const PORTRAIT_USABLE_PX = (210 - PAGE_MARGIN_MM * 2) * MM_TO_PX - SAFETY_MARGIN_PX;
const LANDSCAPE_USABLE_PX = (297 - PAGE_MARGIN_MM * 2) * MM_TO_PX - SAFETY_MARGIN_PX;
// 자동 축소는 이 배율 밑으로는 내려가지 않는다 (더 줄이면 사람이 읽기 어려움) - 이보다 더 필요하면 가로 전환을 권장.
const MIN_AUTO_FIT_SCALE = 0.55;

type FixedColumn = "no" | "name" | "unit" | "qty" | "price" | "amount" | "tax";

const DEFAULT_COL_WIDTHS: Record<FixedColumn, number> = {
  no: 32,
  name: 100,
  unit: 32,
  qty: 32,
  price: 64,
  amount: 72,
  tax: 64,
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
  periodLabel,
  startStr,
  endStr,
  categoriesParam,
  report,
}: {
  vendorId: string;
  vendorName: string;
  categoryLabel: string | null;
  periodLabel: string;
  startStr: string;
  endStr: string;
  categoriesParam?: string;
  report: VendorReport;
}) {
  const [emptyRowCount, setEmptyRowCount] = useState(0);
  const [reviewer1, setReviewer1] = useState("");
  const [reviewer2, setReviewer2] = useState("");
  const [colWidths, setColWidths] = useState<Record<FixedColumn, number>>(DEFAULT_COL_WIDTHS);
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({});
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [dateColWidth, setDateColWidth] = useState(DEFAULT_DATE_COL_WIDTH);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const isLandscape = orientation === "landscape";

  function handleOrientationChange(next: "portrait" | "landscape") {
    setOrientation(next);
    // 가로는 페이지 세로 폭이 짧아져서 줄 수가 줄어드니, 기본 글자크기를 살짝 낮춰 페이지 수 증가를 완화한다.
    setFontSize(next === "landscape" ? 10 : DEFAULT_FONT_SIZE);
  }

  // 가로 인쇄는 페이지 자체를 landscape로 바꿔야 하는데, 이건 인쇄 중인 문서 전체에 적용되는 설정이라
  // (이 보고서는 자기 전용 페이지에서만 열리므로) 켜져 있을 때만 <style>을 주입하는 방식으로 안전하게 처리한다.
  // 참고: 특정 요소에만 페이지를 지정하는 CSS(@page 이름 + page 속성) 방식은 브라우저에 따라
  // 인쇄물이 90도 회전되어 나오는 문제가 있어 사용하지 않는다.
  useEffect(() => {
    if (!isLandscape) return;
    const style = document.createElement("style");
    style.textContent = "@media print { @page { size: landscape; } }";
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, [isLandscape]);

  const fixedColsWidth = Object.values(colWidths).reduce((sum, w) => sum + w, 0);

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
    const defaultVisible = Math.max(2, actualCount);
    const visibleCount = visibleCounts[week.label] !== undefined ? visibleCounts[week.label] : defaultVisible;

    const dates = week.dates.slice(0, visibleCount);
    while (dates.length < visibleCount) {
      dates.push(`empty-${week.label}-${dates.length}`);
    }
    return { ...week, dates, actualCount };
  });

  function handleAddCol(label: string, actualCount: number) {
    setVisibleCounts((prev) => {
      const current = prev[label] !== undefined ? prev[label] : Math.max(2, actualCount);
      return { ...prev, [label]: current + 1 };
    });
  }

  function handleRemoveCol(label: string, actualCount: number) {
    const current = visibleCounts[label] !== undefined ? visibleCounts[label] : Math.max(2, actualCount);
    if (current <= 0) return;

    const targetIndex = current - 1;
    const week = paddedWeeks.find((w) => w.label === label);
    const targetDate = week?.dates[targetIndex];

    if (targetDate && !targetDate.startsWith("empty-")) {
      const hasTaxableData = report.taxableItems.some(
        (item) => item.quantityByDate[targetDate] !== undefined && item.quantityByDate[targetDate] > 0
      );
      const hasExemptData = report.exemptItems.some(
        (item) => item.quantityByDate[targetDate] !== undefined && item.quantityByDate[targetDate] > 0
      );

      if (hasTaxableData || hasExemptData) {
        alert("데이터가 입력되어 있어 삭제 불가");
        return;
      }
    }

    setVisibleCounts((prev) => {
      return { ...prev, [label]: current - 1 };
    });
  }

  const dateColumns = displayWeeks.flatMap((w) => w.dates);
  const colSpanCount = dateColumns.length || 1;
  const totalCols = 7 + colSpanCount;

  // 1차 목표: 세로(A4)는 최대한 한 페이지 폭에 맞춰 자동으로 축소한다 (표 폭을 꽉 채울 필요는 없음).
  // 2차 목표: 그래도(최소 가독 배율까지 줄여도) 안 들어가면 그 이상은 줄이지 않고, 가로 전환을 안내한다.
  // (CSS zoom/transform은 브라우저 인쇄 엔진에서 무시되는 경우가 있어, 실제 픽셀 값 자체를 줄인다.)
  const naturalTableWidthPx = fixedColsWidth + dateColumns.length * dateColWidth;
  const usablePrintWidthPx = isLandscape ? LANDSCAPE_USABLE_PX : PORTRAIT_USABLE_PX;
  const rawAutoFitScale = usablePrintWidthPx / naturalTableWidthPx;
  const autoFitScale = Math.min(1, Math.max(MIN_AUTO_FIT_SCALE, rawAutoFitScale));
  const suggestLandscape = !isLandscape && rawAutoFitScale < MIN_AUTO_FIT_SCALE;

  const effectiveColWidths = Object.fromEntries(
    (Object.entries(colWidths) as [FixedColumn, number][]).map(([key, w]) => [key, w * autoFitScale])
  ) as Record<FixedColumn, number>;
  const effectiveDateColWidth = dateColWidth * autoFitScale;
  const effectiveFontSize = fontSize * autoFitScale;

  function renderItemRow(item: VendorReportItemRow, index: number) {
    return (
      <tr key={`${item.taxType}-${item.itemName}-${item.unit}`}>
        <td className="border border-gray-400 px-1 py-1 text-center">{index + 1}</td>
        <td className="border border-gray-400 px-2 py-1">{item.itemName}</td>
        <td className="border border-gray-400 px-1 py-1 text-center">{item.unit}</td>
        <td className="border border-gray-400 px-2 py-1 text-right">{item.totalQuantity.toLocaleString()}</td>
        <td
          className={`border border-gray-400 px-2 py-1 text-right ${
            item.priceVaries ? "font-semibold text-red-600" : ""
          }`}
          title={item.priceVaries ? "이 기간 중 단가가 달라졌습니다" : undefined}
        >
          {item.unitPrice.toLocaleString()}
          {item.priceVaries && " ⚠"}
        </td>
        <td className="border border-gray-400 px-2 py-1 text-right">{item.totalAmount.toLocaleString()}</td>
        <td className="border border-gray-400 px-2 py-1 text-right">
          {item.taxType === "TAXABLE" ? item.totalTaxAmount.toLocaleString() : "-"}
        </td>
        {dateColumns.map((date) => (
          <td key={date} className="border border-gray-400 px-1 py-1 text-center">
            {!date.startsWith("empty-") && item.quantityByDate[date] ? item.quantityByDate[date].toLocaleString() : ""}
          </td>
        ))}
      </tr>
    );
  }

  const sections = [
    { taxType: "TAXABLE" as const, items: report.taxableItems, supplySubtotal: report.taxableSupplyTotal, taxSubtotal: report.taxableTaxTotal },
    { taxType: "EXEMPT" as const, items: report.exemptItems, supplySubtotal: report.exemptSupplyTotal, taxSubtotal: 0 },
  ].filter((s) => s.items.length > 0);

  const listHref = `/reports?start=${startStr}&end=${endStr}${categoriesParam ? `&categories=${encodeURIComponent(categoriesParam)}` : ""}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href={listHref}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ← 목록으로
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">납품보고서 - {vendorName}</h1>
        </div>
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
          <div className="flex overflow-hidden rounded border border-gray-300 text-xs">
            <button
              type="button"
              onClick={() => handleOrientationChange("portrait")}
              className={`px-2 py-1 font-medium ${
                !isLandscape ? "bg-primary-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              세로
            </button>
            <button
              type="button"
              onClick={() => handleOrientationChange("landscape")}
              className={`px-2 py-1 font-medium ${
                isLandscape ? "bg-primary-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              가로
            </button>
          </div>
          <div className="flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-700">
            <span>글자크기</span>
            <button
              type="button"
              onClick={() => setFontSize((v) => Math.max(MIN_FONT_SIZE, v - FONT_SIZE_STEP))}
              className="flex h-5 w-5 items-center justify-center rounded bg-gray-200 text-xs text-gray-600 hover:bg-gray-300"
            >
              -
            </button>
            <span className="w-5 text-center">{fontSize}</span>
            <button
              type="button"
              onClick={() => setFontSize((v) => Math.min(MAX_FONT_SIZE, v + FONT_SIZE_STEP))}
              className="flex h-5 w-5 items-center justify-center rounded bg-gray-200 text-xs text-gray-600 hover:bg-gray-300"
            >
              +
            </button>
          </div>
          <div className="flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-700">
            <span>납품현황 칸너비</span>
            <button
              type="button"
              onClick={() => setDateColWidth((v) => Math.max(MIN_DATE_COL_WIDTH, v - DATE_COL_WIDTH_STEP))}
              className="flex h-5 w-5 items-center justify-center rounded bg-gray-200 text-xs text-gray-600 hover:bg-gray-300"
            >
              -
            </button>
            <span className="w-5 text-center">{dateColWidth}</span>
            <button
              type="button"
              onClick={() => setDateColWidth((v) => v + DATE_COL_WIDTH_STEP)}
              className="flex h-5 w-5 items-center justify-center rounded bg-gray-200 text-xs text-gray-600 hover:bg-gray-300"
            >
              +
            </button>
          </div>
          <PrintButton />
          <a
            href={`/api/reports/vendor-export?vendorId=${vendorId}&start=${startStr}&end=${endStr}${categoriesParam ? `&categories=${encodeURIComponent(categoriesParam)}` : ""}`}
            className="rounded bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            엑셀로 내보내기
          </a>
        </div>
      </div>

      {suggestLandscape && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 print:hidden">
          ⚠ 항목/칸이 많아 세로로는 최소 배율({Math.round(MIN_AUTO_FIT_SCALE * 100)}%)까지 줄여도 A4 한 장에 다
          안 들어가요. 위의 &quot;가로&quot; 버튼으로 전환해 보세요.
        </p>
      )}

      <div
        className={`mx-auto w-full max-w-[210mm] bg-white p-8 print:p-0 ${
          isLandscape ? "print-landscape print:max-w-[273mm]" : ""
        }`}
      >
        <div className={isLandscape ? "mb-2" : "mb-4"}>
          <h2
            className={
              isLandscape
                ? "mb-2 text-center text-2xl font-bold tracking-[0.2em] text-gray-900 underline underline-offset-4"
                : "mb-8 text-center text-4xl font-bold tracking-[0.3em] text-gray-900 underline underline-offset-8"
            }
          >
            납품보고서
          </h2>
          <div className="flex items-end justify-between">
            <div className={`text-base text-gray-800 ${isLandscape ? "space-y-1" : "space-y-4"}`}>
              <p>
                <span className="inline-block w-20 tracking-[0.5em]">업체명</span>: &nbsp; {vendorName}
                {categoryLabel ? `(${categoryLabel})` : ""}
              </p>
              <p>
                <span className="inline-block w-20 tracking-[0.5em]">일자</span>: &nbsp; {periodLabel}
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
                  <td className={`border border-gray-400 ${isLandscape ? "h-8" : "h-16"}`} />
                  <td className={`border border-gray-400 ${isLandscape ? "h-8" : "h-16"}`} />
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
          <table className="w-full min-w-max border-collapse" style={{ fontSize: effectiveFontSize }}>
            <thead>
              <tr className="bg-gray-50 text-center">
                <th rowSpan={3} className="border border-gray-400 px-1 py-1" style={{ width: effectiveColWidths.no }}>
                  <ColumnHeaderLabel
                    label="번호"
                    onDecrease={() => adjustWidth("no", -WIDTH_STEP)}
                    onIncrease={() => adjustWidth("no", WIDTH_STEP)}
                  />
                </th>
                <th rowSpan={3} className="border border-gray-400 px-2 py-1" style={{ width: effectiveColWidths.name }}>
                  <ColumnHeaderLabel
                    label="품명/규격"
                    onDecrease={() => adjustWidth("name", -WIDTH_STEP)}
                    onIncrease={() => adjustWidth("name", WIDTH_STEP)}
                  />
                </th>
                <th rowSpan={3} className="border border-gray-400 px-1 py-1" style={{ width: effectiveColWidths.unit }}>
                  <ColumnHeaderLabel
                    label="단위"
                    onDecrease={() => adjustWidth("unit", -WIDTH_STEP)}
                    onIncrease={() => adjustWidth("unit", WIDTH_STEP)}
                  />
                </th>
                <th rowSpan={3} className="border border-gray-400 px-1 py-1" style={{ width: effectiveColWidths.qty }}>
                  <ColumnHeaderLabel
                    label="수량"
                    onDecrease={() => adjustWidth("qty", -WIDTH_STEP)}
                    onIncrease={() => adjustWidth("qty", WIDTH_STEP)}
                  />
                </th>
                <th rowSpan={3} className="border border-gray-400 px-1 py-1" style={{ width: effectiveColWidths.price }}>
                  <ColumnHeaderLabel
                    label="단가"
                    onDecrease={() => adjustWidth("price", -WIDTH_STEP)}
                    onIncrease={() => adjustWidth("price", WIDTH_STEP)}
                  />
                </th>
                <th rowSpan={3} className="border border-gray-400 px-1 py-1" style={{ width: effectiveColWidths.amount }}>
                  <ColumnHeaderLabel
                    label="금액"
                    onDecrease={() => adjustWidth("amount", -WIDTH_STEP)}
                    onIncrease={() => adjustWidth("amount", WIDTH_STEP)}
                  />
                </th>
                <th rowSpan={3} className="border border-gray-400 px-1 py-1" style={{ width: effectiveColWidths.tax }}>
                  <ColumnHeaderLabel
                    label="세액"
                    onDecrease={() => adjustWidth("tax", -WIDTH_STEP)}
                    onIncrease={() => adjustWidth("tax", WIDTH_STEP)}
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
                      return (
                        <th
                          key={date}
                          className="border border-gray-400 px-1 py-1 text-[10px] font-normal tracking-tighter"
                          style={{ width: effectiveDateColWidth, minWidth: effectiveDateColWidth }}
                        />
                      );
                    }
                    const [, m, d] = date.split("-");
                    return (
                      <th
                        key={date}
                        className="border border-gray-400 px-1 py-1 text-[10px] font-normal tracking-tighter"
                        style={{ width: effectiveDateColWidth, minWidth: effectiveDateColWidth }}
                      >
                        {parseInt(m, 10)}/{parseInt(d, 10)}
                      </th>
                    );
                  })
                )}
                {dateColumns.length === 0 && <th className="border border-gray-400 px-2 py-1">-</th>}
              </tr>
            </thead>
            <tbody>
              {sections.map((section) => (
                <Fragment key={section.taxType}>
                  <tr className="bg-gray-100">
                    <td colSpan={totalCols} className="border border-gray-400 px-2 py-1 font-semibold">
                      {TAX_TYPE_LABELS[section.taxType]}
                    </td>
                  </tr>
                  {section.items.map((item, index) => renderItemRow(item, index))}
                  <tr className="bg-gray-50">
                    <td colSpan={5} className="border border-gray-400 px-2 py-1 text-right font-semibold">
                      {TAX_TYPE_LABELS[section.taxType]} 소계
                    </td>
                    <td className="border border-gray-400 px-2 py-1 text-right font-semibold">
                      {section.supplySubtotal.toLocaleString()}
                    </td>
                    <td className="border border-gray-400 px-2 py-1 text-right font-semibold">
                      {section.taxType === "TAXABLE" ? section.taxSubtotal.toLocaleString() : "-"}
                    </td>
                    {dateColumns.map((date) => (
                      <td key={date} className="border border-gray-400" />
                    ))}
                  </tr>
                </Fragment>
              ))}
              {sections.length === 0 && emptyRowCount === 0 && (
                <tr>
                  <td colSpan={totalCols} className="border border-gray-400 px-2 py-6 text-center text-gray-400">
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
                  <td className="border border-gray-400 px-2 py-4 text-right"></td>
                  {dateColumns.map((date) => (
                    <td key={`empty-${i}-${date}`} className="border border-gray-400 px-1 py-4 text-center"></td>
                  ))}
                </tr>
              ))}
            </tbody>
            {sections.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={5} className="border border-gray-400 bg-gray-50 px-2 py-1 text-center font-semibold tracking-widest">
                    총 합계
                  </td>
                  <td colSpan={2} className="border border-gray-400 px-2 py-1 text-right font-semibold">
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

        {sections.length > 0 && (
          <p className="mt-2 text-right text-sm font-medium text-gray-900">
            공급가액 합계: {(report.taxableSupplyTotal + report.exemptSupplyTotal).toLocaleString()}원 · 세액 합계:{" "}
            {report.taxableTaxTotal.toLocaleString()}원 · 총 합계: {report.grandTotal.toLocaleString()}원
          </p>
        )}
      </div>
    </div>
  );
}
