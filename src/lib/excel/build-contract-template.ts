import ExcelJS from "exceljs";
import type { TaxTypeCode } from "../tax";

const THIN = { style: "thin" as const };
const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
const BOX_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };

export async function buildContractTemplate(taxType: TaxTypeCode): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("계약단가표");

  // 그리드 라인 보이기
  sheet.views = [{ showGridLines: true }];

  // 1. 대제목
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = `계약 단가표 (${taxType === "TAXABLE" ? "과세" : "면세"})`;
  titleCell.font = { bold: true, size: 15, color: { argb: "FF111827" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 40;
  sheet.mergeCells(1, 1, 1, 4);

  // 2. 안내 문구
  const noteCell = sheet.getCell(2, 1);
  noteCell.value = "※ 품명, 규격, 계약단가를 빠짐없이 기입해 주시기 바랍니다.";
  noteCell.font = { size: 9, color: { argb: "FF4B5563" }, italic: true };
  noteCell.alignment = { horizontal: "left", vertical: "middle" };
  sheet.getRow(2).height = 20;
  sheet.mergeCells(2, 1, 2, 4);

  // 3. 업체 정보 서식 박스 (3행 ~ 5행)
  // [A3] 업체명 라벨
  sheet.getCell(3, 1).value = "업 체 명";
  sheet.getCell(3, 1).font = { bold: true, size: 9 };
  sheet.getCell(3, 1).alignment = { horizontal: "center", vertical: "middle" };
  sheet.getCell(3, 1).fill = HEADER_FILL;
  sheet.getCell(3, 1).border = { top: THIN, left: THIN, bottom: THIN, right: THIN };
  
  // [B3] 업체명 기입란
  sheet.getCell(3, 2).value = "";
  sheet.getCell(3, 2).alignment = { horizontal: "left", vertical: "middle" };
  sheet.getCell(3, 2).border = { top: THIN, left: THIN, bottom: THIN, right: THIN };

  // [A4] 사업자등록번호 라벨
  sheet.getCell(4, 1).value = "사업자등록번호";
  sheet.getCell(4, 1).font = { bold: true, size: 9 };
  sheet.getCell(4, 1).alignment = { horizontal: "center", vertical: "middle" };
  sheet.getCell(4, 1).fill = HEADER_FILL;
  sheet.getCell(4, 1).border = { top: THIN, left: THIN, bottom: THIN, right: THIN };

  // [B4] 사업자등록번호 기입란
  sheet.getCell(4, 2).value = "";
  sheet.getCell(4, 2).alignment = { horizontal: "left", vertical: "middle" };
  sheet.getCell(4, 2).border = { top: THIN, left: THIN, bottom: THIN, right: THIN };

  // [A5] 계약시작일 라벨
  sheet.getCell(5, 1).value = "계약기간";
  sheet.getCell(5, 1).font = { bold: true, size: 9 };
  sheet.getCell(5, 1).alignment = { horizontal: "center", vertical: "middle" };
  sheet.getCell(5, 1).fill = HEADER_FILL;
  sheet.getCell(5, 1).border = { top: THIN, left: THIN, bottom: THIN, right: THIN };

  // [B5] 계약기간 기입란
  sheet.getCell(5, 2).value = "";
  sheet.getCell(5, 2).alignment = { horizontal: "left", vertical: "middle" };
  sheet.getCell(5, 2).border = { top: THIN, left: THIN, bottom: THIN, right: THIN };

  // [C3:D5] 직인 란 구성
  sheet.mergeCells(3, 3, 5, 3);
  const signLabelCell = sheet.getCell(3, 3);
  signLabelCell.value = "대표자\n(직인)";
  signLabelCell.font = { bold: true, size: 9 };
  signLabelCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  signLabelCell.fill = HEADER_FILL;
  
  sheet.mergeCells(3, 4, 5, 4);
  const signBoxCell = sheet.getCell(3, 4);
  signBoxCell.value = "(인)";
  signBoxCell.font = { color: { argb: "FF9CA3AF" }, size: 12 };
  signBoxCell.alignment = { horizontal: "center", vertical: "middle" };
  signBoxCell.fill = BOX_FILL;

  // C3:D5 의 합병 영역 개별 셀 테두리 수동 지정
  for (let r = 3; r <= 5; r++) {
    for (let c = 3; c <= 4; c++) {
      sheet.getCell(r, c).border = { top: THIN, left: THIN, bottom: THIN, right: THIN };
    }
  }

  sheet.getRow(3).height = 20;
  sheet.getRow(4).height = 20;
  sheet.getRow(5).height = 20;

  // 4. 품목 데이터 테이블 시작 (7행)
  const headers = ["번호", "품명", "규격", "계약단가 (원)"];
  const headerRow = 7;
  
  headers.forEach((label, i) => {
    const cell = sheet.getCell(headerRow, i + 1);
    cell.value = label;
    cell.font = { bold: true, size: 10, color: { argb: "FF111827" } };
    cell.fill = HEADER_FILL;
    cell.border = { top: THIN, left: THIN, right: THIN, bottom: THIN };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });
  sheet.getRow(headerRow).height = 26;

  // 데이터 빈칸 30개 행 그리기
  const dataStartRow = 8;
  const rowCount = 30;
  for (let r = dataStartRow; r < dataStartRow + rowCount; r++) {
    sheet.getRow(r).height = 20;
    // 번호 자동 기입
    sheet.getCell(r, 1).value = r - dataStartRow + 1;
    sheet.getCell(r, 1).alignment = { horizontal: "center", vertical: "middle" };
    sheet.getCell(r, 1).font = { size: 9, color: { argb: "FF9CA3AF" } };
    sheet.getCell(r, 1).fill = BOX_FILL;

    for (let c = 1; c <= 4; c++) {
      const cell = sheet.getCell(r, c);
      cell.border = { top: THIN, left: THIN, right: THIN, bottom: THIN };
      if (c === 2) {
        cell.alignment = { horizontal: "left", vertical: "middle" };
      } else if (c === 3) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else if (c === 4) {
        cell.alignment = { horizontal: "right", vertical: "middle" };
        cell.numFmt = "#,##0";
      }
    }
  }

  // 열 너비 지정
  sheet.getColumn(1).width = 8;   // 번호
  sheet.getColumn(2).width = 28;  // 품명
  sheet.getColumn(3).width = 14;  // 규격
  sheet.getColumn(4).width = 18;  // 계약단가

  return workbook.xlsx.writeBuffer();
}
