import ExcelJS from "exceljs";
import { formatReportIssueDate, type VendorReport, type VendorReportItemRow } from "../vendor-report";
import { TAX_TYPE_LABELS, type TaxTypeCode } from "../tax";

const THIN = { style: "thin" as const };
const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
const SECTION_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };

const BASE_COL_COUNT = 7; // 번호/품명/단위/수량/단가/금액/세액

export async function buildVendorReportWorkbook(params: {
  vendorName: string;
  categoryLabel: string | null;
  year: number;
  month: number;
  report: VendorReport;
}): Promise<ExcelJS.Buffer> {
  const { vendorName, categoryLabel, year, month, report } = params;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("납품보고서");

  const dateColumns = report.weeks.flatMap((w) => w.dates);
  const totalCols = BASE_COL_COUNT + Math.max(dateColumns.length, 1);
  const infoColEnd = Math.max(1, totalCols - 3);

  sheet.mergeCells(1, 1, 1, infoColEnd);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = "납품보고서";
  titleCell.font = { bold: true, size: 16 };
  titleCell.alignment = { horizontal: "center" };

  sheet.mergeCells(2, 1, 2, infoColEnd);
  const vendorCell = sheet.getCell(2, 1);
  vendorCell.value = `업체명 : ${vendorName}${categoryLabel ? `(${categoryLabel})` : ""}`;

  sheet.mergeCells(3, 1, 3, infoColEnd);
  const dateCell = sheet.getCell(3, 1);
  dateCell.value = `일자 : ${formatReportIssueDate(year, month)}`;

  const approvalStartCol = infoColEnd + 1;
  ["담당", "차장"].forEach((role, idx) => {
    const col = approvalStartCol + idx;
    const labelCell = sheet.getCell(1, col);
    labelCell.value = role;
    labelCell.font = { bold: true };
    labelCell.alignment = { horizontal: "center" };
    labelCell.border = { top: THIN, left: THIN, right: THIN, bottom: THIN };
    for (let r = 2; r <= 3; r++) {
      sheet.getCell(r, col).border = { top: THIN, left: THIN, right: THIN, bottom: THIN };
    }
  });

  const weekHeaderRow = 4;
  const dateHeaderRow = 5;
  const baseHeaders = ["번호", "품명/규격", "단위", "수량", "단가", "금액", "세액"];
  baseHeaders.forEach((label, i) => {
    sheet.mergeCells(weekHeaderRow, i + 1, dateHeaderRow, i + 1);
    const cell = sheet.getCell(weekHeaderRow, i + 1);
    cell.value = label;
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.fill = HEADER_FILL;
    cell.border = { top: THIN, left: THIN, right: THIN, bottom: THIN };
  });

  let colCursor = BASE_COL_COUNT + 1;
  if (report.weeks.length === 0) {
    const cell = sheet.getCell(weekHeaderRow, colCursor);
    cell.value = "납품현황";
    cell.font = { bold: true };
    cell.fill = HEADER_FILL;
    cell.border = { top: THIN, left: THIN, right: THIN, bottom: THIN };
  }
  for (const week of report.weeks) {
    const startCol = colCursor;
    const endCol = colCursor + week.dates.length - 1;
    if (week.dates.length > 1) {
      sheet.mergeCells(weekHeaderRow, startCol, weekHeaderRow, endCol);
    }
    const weekCell = sheet.getCell(weekHeaderRow, startCol);
    weekCell.value = week.label;
    weekCell.font = { bold: true };
    weekCell.alignment = { horizontal: "center" };
    weekCell.fill = HEADER_FILL;

    week.dates.forEach((date, i) => {
      const cell = sheet.getCell(dateHeaderRow, startCol + i);
      cell.value = date.slice(5);
      cell.font = { bold: true, size: 9 };
      cell.alignment = { horizontal: "center" };
      cell.fill = HEADER_FILL;
      cell.border = { top: THIN, left: THIN, right: THIN, bottom: THIN };
    });
    colCursor = endCol + 1;
  }

  function writeItemRow(rowIdx: number, index: number, item: VendorReportItemRow) {
    sheet.getCell(rowIdx, 1).value = index + 1;
    sheet.getCell(rowIdx, 2).value = item.itemName;
    sheet.getCell(rowIdx, 3).value = item.unit;
    sheet.getCell(rowIdx, 4).value = item.totalQuantity;

    const priceCell = sheet.getCell(rowIdx, 5);
    priceCell.value = item.unitPrice;
    priceCell.numFmt = "#,##0";
    if (item.priceVaries) {
      priceCell.font = { color: { argb: "FFDC2626" }, bold: true };
    }

    const amountCell = sheet.getCell(rowIdx, 6);
    amountCell.value = item.totalAmount;
    amountCell.numFmt = "#,##0";

    const taxCell = sheet.getCell(rowIdx, 7);
    if (item.taxType === "TAXABLE") {
      taxCell.value = item.totalTaxAmount;
      taxCell.numFmt = "#,##0";
    } else {
      taxCell.value = "-";
      taxCell.alignment = { horizontal: "center" };
    }

    for (let c = 1; c <= BASE_COL_COUNT; c++) {
      sheet.getCell(rowIdx, c).border = { top: THIN, left: THIN, right: THIN, bottom: THIN };
    }

    let c = BASE_COL_COUNT + 1;
    for (const week of report.weeks) {
      for (const date of week.dates) {
        const cell = sheet.getCell(rowIdx, c);
        const qty = item.quantityByDate[date];
        if (qty) cell.value = qty;
        cell.alignment = { horizontal: "center" };
        cell.border = { top: THIN, left: THIN, right: THIN, bottom: THIN };
        c += 1;
      }
    }
  }

  function writeSectionHeader(rowIdx: number, taxType: TaxTypeCode) {
    sheet.mergeCells(rowIdx, 1, rowIdx, totalCols);
    const cell = sheet.getCell(rowIdx, 1);
    cell.value = TAX_TYPE_LABELS[taxType];
    cell.font = { bold: true };
    cell.fill = SECTION_FILL;
    cell.border = { top: THIN, left: THIN, right: THIN, bottom: THIN };
  }

  function writeSubtotalRow(rowIdx: number, taxType: TaxTypeCode, supplySubtotal: number, taxSubtotal: number) {
    sheet.mergeCells(rowIdx, 1, rowIdx, 5);
    const labelCell = sheet.getCell(rowIdx, 1);
    labelCell.value = `${TAX_TYPE_LABELS[taxType]} 소계`;
    labelCell.font = { bold: true };
    labelCell.alignment = { horizontal: "right" };

    const supplyCell = sheet.getCell(rowIdx, 6);
    supplyCell.value = supplySubtotal;
    supplyCell.numFmt = "#,##0";
    supplyCell.font = { bold: true };

    const taxCell = sheet.getCell(rowIdx, 7);
    if (taxType === "TAXABLE") {
      taxCell.value = taxSubtotal;
      taxCell.numFmt = "#,##0";
    } else {
      taxCell.value = "-";
      taxCell.alignment = { horizontal: "center" };
    }
    taxCell.font = { bold: true };

    for (let c = 1; c <= BASE_COL_COUNT; c++) {
      sheet.getCell(rowIdx, c).border = { top: THIN, left: THIN, right: THIN, bottom: THIN };
    }
  }

  const sections = [
    { taxType: "TAXABLE" as const, items: report.taxableItems, supplySubtotal: report.taxableSupplyTotal, taxSubtotal: report.taxableTaxTotal },
    { taxType: "EXEMPT" as const, items: report.exemptItems, supplySubtotal: report.exemptSupplyTotal, taxSubtotal: 0 },
  ].filter((s) => s.items.length > 0);

  let rowIdx = dateHeaderRow + 1;
  for (const section of sections) {
    writeSectionHeader(rowIdx, section.taxType);
    rowIdx += 1;
    section.items.forEach((item, index) => {
      writeItemRow(rowIdx, index, item);
      rowIdx += 1;
    });
    writeSubtotalRow(rowIdx, section.taxType, section.supplySubtotal, section.taxSubtotal);
    rowIdx += 1;
  }

  if (sections.length === 0) {
    sheet.mergeCells(rowIdx, 1, rowIdx, totalCols);
    const emptyCell = sheet.getCell(rowIdx, 1);
    emptyCell.value = "해당 기간에 확정된 납품 내역이 없습니다.";
    emptyCell.alignment = { horizontal: "center" };
    rowIdx += 1;
  } else {
    sheet.mergeCells(rowIdx, 1, rowIdx, 5);
    const totalLabelCell = sheet.getCell(rowIdx, 1);
    totalLabelCell.value = "총 합계";
    totalLabelCell.font = { bold: true, size: 12 };
    totalLabelCell.alignment = { horizontal: "right" };
    totalLabelCell.border = { top: { style: "double" } };

    sheet.mergeCells(rowIdx, 6, rowIdx, 7);
    const totalAmountCell = sheet.getCell(rowIdx, 6);
    totalAmountCell.value = report.grandTotal;
    totalAmountCell.numFmt = "#,##0";
    totalAmountCell.font = { bold: true, size: 12 };
    totalAmountCell.border = { top: { style: "double" } };
    rowIdx += 1;
  }

  sheet.getColumn(1).width = 6;
  sheet.getColumn(2).width = 18;
  sheet.getColumn(3).width = 8;
  sheet.getColumn(4).width = 8;
  sheet.getColumn(5).width = 10;
  sheet.getColumn(6).width = 12;
  sheet.getColumn(7).width = 10;
  for (let i = BASE_COL_COUNT + 1; i < colCursor; i++) {
    sheet.getColumn(i).width = 7;
  }

  return workbook.xlsx.writeBuffer();
}
