import ExcelJS from "exceljs";
import { INSPECTION_BASE_COLUMN_LABELS, type InspectionColumn } from "../inspection";

const THIN = { style: "thin" as const };
const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };

export async function buildInspectionWorkbook(params: {
  dateStr: string;
  inspectorName: string | null;
  columns: InspectionColumn[];
  rows: {
    itemName: string;
    unit: string;
    quantity: number;
    vendorName: string;
    values: Record<string, string>;
  }[];
}): Promise<ExcelJS.Buffer> {
  const { dateStr, inspectorName, columns, rows } = params;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("검수일지");

  const baseColCount = INSPECTION_BASE_COLUMN_LABELS.length;
  const totalCols = baseColCount + Math.max(columns.length, 1);

  sheet.mergeCells(1, 1, 1, totalCols);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = "식재료 검수일지";
  titleCell.font = { bold: true, size: 16 };
  titleCell.alignment = { horizontal: "center" };

  sheet.mergeCells(2, 1, 2, Math.ceil(totalCols / 2));
  sheet.getCell(2, 1).value = `입고일자 : ${dateStr}`;
  sheet.mergeCells(2, Math.ceil(totalCols / 2) + 1, 2, totalCols);
  sheet.getCell(2, Math.ceil(totalCols / 2) + 1).value = `검수자 : ${inspectorName ?? "-"}`;

  const headerRow = 4;
  const headers = [...INSPECTION_BASE_COLUMN_LABELS, ...columns.map((c) => c.label)];
  headers.forEach((label, i) => {
    const cell = sheet.getCell(headerRow, i + 1);
    cell.value = label;
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.fill = HEADER_FILL;
    cell.border = { top: THIN, left: THIN, right: THIN, bottom: THIN };
  });

  let rowIdx = headerRow + 1;
  for (const row of rows) {
    const baseValues = [row.itemName, row.unit, row.quantity, row.vendorName];
    baseValues.forEach((value, i) => {
      sheet.getCell(rowIdx, i + 1).value = value;
    });
    columns.forEach((col, i) => {
      sheet.getCell(rowIdx, baseColCount + i + 1).value = row.values[col.key] ?? "";
    });
    for (let c = 1; c <= headers.length; c++) {
      sheet.getCell(rowIdx, c).border = { top: THIN, left: THIN, right: THIN, bottom: THIN };
    }
    rowIdx += 1;
  }

  if (rows.length === 0) {
    sheet.mergeCells(rowIdx, 1, rowIdx, totalCols);
    const emptyCell = sheet.getCell(rowIdx, 1);
    emptyCell.value = "확정된 거래명세표 품목이 없습니다.";
    emptyCell.alignment = { horizontal: "center" };
  }

  sheet.getColumn(1).width = 18;
  sheet.getColumn(2).width = 8;
  sheet.getColumn(3).width = 8;
  sheet.getColumn(4).width = 16;
  for (let i = baseColCount + 1; i <= headers.length; i++) {
    sheet.getColumn(i).width = 14;
  }

  return workbook.xlsx.writeBuffer();
}
