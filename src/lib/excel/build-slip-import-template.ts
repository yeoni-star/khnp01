import ExcelJS from "exceljs";
import type { TaxTypeCode } from "../tax";

const THIN = { style: "thin" as const };
const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };

export const SLIP_IMPORT_HEADER_ROW = 3;

export function buildSlipImportHeaders(taxType: TaxTypeCode): string[] {
  return ["품명", "규격", "수량", "단가"];
}

export async function buildSlipImportTemplate(taxType: TaxTypeCode): Promise<ExcelJS.Buffer> {
  const headers = buildSlipImportHeaders(taxType);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("거래명세표");

  const titleCell = sheet.getCell(1, 1);
  titleCell.value = `거래명세표 업로드 양식 (${taxType === "TAXABLE" ? "과세" : "면세"})`;
  titleCell.font = { bold: true, size: 14 };
  sheet.mergeCells(1, 1, 1, headers.length);

  const noteCell = sheet.getCell(2, 1);
  noteCell.value =
    taxType === "TAXABLE"
      ? "수량과 단가를 입력해 주세요. 공급가액 및 세액은 자동으로 계산되어 반영됩니다."
      : "수량과 단가를 입력해 주세요. 공급가액은 자동으로 계산되어 반영됩니다.";
  noteCell.font = { italic: true, size: 9, color: { argb: "FF6B7280" } };
  sheet.mergeCells(2, 1, 2, headers.length);

  headers.forEach((label, i) => {
    const cell = sheet.getCell(SLIP_IMPORT_HEADER_ROW, i + 1);
    cell.value = label;
    cell.font = { bold: true };
    cell.fill = HEADER_FILL;
    cell.border = { top: THIN, left: THIN, right: THIN, bottom: THIN };
    cell.alignment = { horizontal: "center" };
  });

  for (let r = SLIP_IMPORT_HEADER_ROW + 1; r <= SLIP_IMPORT_HEADER_ROW + 20; r++) {
    for (let c = 1; c <= headers.length; c++) {
      sheet.getCell(r, c).border = { top: THIN, left: THIN, right: THIN, bottom: THIN };
    }
  }

  sheet.getColumn(1).width = 24;
  sheet.getColumn(2).width = 12;
  sheet.getColumn(3).width = 8;
  sheet.getColumn(4).width = 12;

  return workbook.xlsx.writeBuffer();
}
