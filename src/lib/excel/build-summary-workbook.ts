import ExcelJS from "exceljs";
import type { SummaryReport } from "../report-aggregate";
import { CATEGORY_LABELS } from "../categories";

const THIN = { style: "thin" as const };
const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };

export async function buildSummaryWorkbook(params: {
  restaurantLabel: string;
  year: number;
  month: number;
  report: SummaryReport;
}): Promise<ExcelJS.Buffer> {
  const { restaurantLabel, year, month, report } = params;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("전체통합요약");

  sheet.mergeCells(1, 1, 1, 3);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = `월별 납품보고서(전체 통합) - ${restaurantLabel} - ${year}년 ${month}월`;
  titleCell.font = { bold: true, size: 14 };

  const approvalStartCol = 4;
  ["담당", "차장", "부장"].forEach((role, idx) => {
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

  const headerRow = 4;
  ["카테고리", "금액"].forEach((label, i) => {
    const cell = sheet.getCell(headerRow, i + 1);
    cell.value = label;
    cell.font = { bold: true };
    cell.fill = HEADER_FILL;
    cell.border = { top: THIN, left: THIN, right: THIN, bottom: THIN };
  });

  let rowIdx = headerRow + 1;
  for (const section of report.sections) {
    sheet.getCell(rowIdx, 1).value = CATEGORY_LABELS[section.category];
    sheet.getCell(rowIdx, 1).font = { bold: true };
    const amountCell = sheet.getCell(rowIdx, 2);
    amountCell.value = section.subtotal;
    amountCell.numFmt = "#,##0";
    for (let c = 1; c <= 2; c++) {
      sheet.getCell(rowIdx, c).border = { top: THIN, left: THIN, right: THIN, bottom: THIN };
    }
    rowIdx += 1;
  }

  if (report.sections.length === 0) {
    sheet.mergeCells(rowIdx, 1, rowIdx, 2);
    const emptyCell = sheet.getCell(rowIdx, 1);
    emptyCell.value = "해당 월에 확정된 납품 내역이 없습니다.";
    emptyCell.alignment = { horizontal: "center" };
    rowIdx += 1;
  }

  const totalLabel = sheet.getCell(rowIdx, 1);
  totalLabel.value = "총 합계";
  totalLabel.font = { bold: true, size: 12 };
  totalLabel.alignment = { horizontal: "right" };
  totalLabel.border = { top: { style: "double" } };
  const totalAmount = sheet.getCell(rowIdx, 2);
  totalAmount.value = report.grandTotal;
  totalAmount.numFmt = "#,##0";
  totalAmount.font = { bold: true, size: 12 };
  totalAmount.border = { top: { style: "double" } };

  sheet.getColumn(1).width = 14;
  sheet.getColumn(2).width = 14;

  return workbook.xlsx.writeBuffer();
}
