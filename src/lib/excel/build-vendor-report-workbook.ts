import ExcelJS from "exceljs";
import type { VendorReport } from "../vendor-report";

const THIN = { style: "thin" as const };
const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };

export async function buildVendorReportWorkbook(params: {
  vendorName: string;
  restaurantLabel: string;
  year: number;
  month: number;
  report: VendorReport;
}): Promise<ExcelJS.Buffer> {
  const { vendorName, restaurantLabel, year, month, report } = params;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("납품보고서");

  const baseColCount = 6; // 번호/품명/단위/수량/단가/금액
  const dateColumns = report.weeks.flatMap((w) => w.dates);
  const totalCols = baseColCount + Math.max(dateColumns.length, 1);

  sheet.mergeCells(1, 1, 1, Math.max(1, totalCols - 3));
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = `납품보고서 - ${restaurantLabel} - ${vendorName} - ${year}년 ${month}월`;
  titleCell.font = { bold: true, size: 14 };

  const approvalStartCol = Math.max(1, totalCols - 3) + 1;
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
  const baseHeaders = ["번호", "품명", "단위", "수량", "단가", "금액"];
  baseHeaders.forEach((label, i) => {
    sheet.mergeCells(weekHeaderRow, i + 1, dateHeaderRow, i + 1);
    const cell = sheet.getCell(weekHeaderRow, i + 1);
    cell.value = label;
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.fill = HEADER_FILL;
    cell.border = { top: THIN, left: THIN, right: THIN, bottom: THIN };
  });

  let colCursor = baseColCount + 1;
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

  let rowIdx = dateHeaderRow + 1;
  report.items.forEach((item, index) => {
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

    for (let c = 1; c <= 6; c++) {
      sheet.getCell(rowIdx, c).border = { top: THIN, left: THIN, right: THIN, bottom: THIN };
    }

    let c = baseColCount + 1;
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
    rowIdx += 1;
  });

  if (report.items.length === 0) {
    sheet.mergeCells(rowIdx, 1, rowIdx, totalCols);
    const emptyCell = sheet.getCell(rowIdx, 1);
    emptyCell.value = "해당 기간에 확정된 납품 내역이 없습니다.";
    emptyCell.alignment = { horizontal: "center" };
    rowIdx += 1;
  }

  sheet.mergeCells(rowIdx, 1, rowIdx, 5);
  const totalLabelCell = sheet.getCell(rowIdx, 1);
  totalLabelCell.value = "합계";
  totalLabelCell.font = { bold: true };
  totalLabelCell.alignment = { horizontal: "right" };
  totalLabelCell.border = { top: { style: "double" } };
  const totalAmountCell = sheet.getCell(rowIdx, 6);
  totalAmountCell.value = report.grandTotal;
  totalAmountCell.numFmt = "#,##0";
  totalAmountCell.font = { bold: true };
  totalAmountCell.border = { top: { style: "double" } };

  sheet.getColumn(1).width = 6;
  sheet.getColumn(2).width = 18;
  sheet.getColumn(3).width = 8;
  sheet.getColumn(4).width = 8;
  sheet.getColumn(5).width = 10;
  sheet.getColumn(6).width = 12;
  for (let i = baseColCount + 1; i < colCursor; i++) {
    sheet.getColumn(i).width = 7;
  }

  return workbook.xlsx.writeBuffer();
}
