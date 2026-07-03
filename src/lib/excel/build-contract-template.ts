import ExcelJS from "exceljs";
import type { TaxTypeCode } from "../tax";

const THIN = { style: "thin" as const };
const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
const BOX_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };

export async function buildContractTemplate(taxType: TaxTypeCode): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("계약단가표");

  // 과세 여부에 따른 컬럼 수 결정
  // 면세: 번호/품명/규격/계약단가 (4열)
  // 과세: 번호/품명/규격/계약단가/세액 (5열)
  const colsCount = taxType === "TAXABLE" ? 5 : 4;

  // 그리드 라인 보이기
  sheet.views = [{ showGridLines: true }];

  // 1. 대제목
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = `계약 단가표 (${taxType === "TAXABLE" ? "과세" : "면세"})`;
  titleCell.font = { bold: true, size: 15, color: { argb: "FF111827" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 40;
  sheet.mergeCells(1, 1, 1, colsCount);

  // 2. 안내 문구
  const noteCell = sheet.getCell(2, 1);
  noteCell.value =
    taxType === "TAXABLE"
      ? "※ 품명, 규격, 계약단가를 빠짐없이 기입해 주시기 바랍니다. (세액은 계약단가의 10%로 자동 계산됩니다)"
      : "※ 품명, 규격, 계약단가를 빠짐없이 기입해 주시기 바랍니다.";
  noteCell.font = { size: 9, color: { argb: "FF4B5563" }, italic: true };
  noteCell.alignment = { horizontal: "left", vertical: "middle" };
  sheet.getRow(2).height = 20;
  sheet.mergeCells(2, 1, 2, colsCount);

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

  // [B5] 사업자등록번호 기입란
  sheet.getCell(4, 2).value = "";
  sheet.getCell(4, 2).alignment = { horizontal: "left", vertical: "middle" };
  sheet.getCell(4, 2).border = { top: THIN, left: THIN, bottom: THIN, right: THIN };

  // [C3:D4] 직인 란 구성 (마지막 두 열 사용, 계약기간 없으므로 3~4행)
  const signCol1 = colsCount - 1; // 직인 라벨 열
  const signCol2 = colsCount;     // 직인 박스 열

  sheet.mergeCells(3, signCol1, 4, signCol1);
  const signLabelCell = sheet.getCell(3, signCol1);
  signLabelCell.value = "대표자\n(직인)";
  signLabelCell.font = { bold: true, size: 9 };
  signLabelCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  signLabelCell.fill = HEADER_FILL;

  sheet.mergeCells(3, signCol2, 4, signCol2);
  const signBoxCell = sheet.getCell(3, signCol2);
  signBoxCell.value = "(인)";
  signBoxCell.font = { color: { argb: "FF9CA3AF" }, size: 12 };
  signBoxCell.alignment = { horizontal: "center", vertical: "middle" };
  signBoxCell.fill = BOX_FILL;

  for (let r = 3; r <= 4; r++) {
    for (let c = signCol1; c <= signCol2; c++) {
      sheet.getCell(r, c).border = { top: THIN, left: THIN, bottom: THIN, right: THIN };
    }
  }

  sheet.getRow(3).height = 20;
  sheet.getRow(4).height = 20;

  // 4. 품목 데이터 테이블 헤더 (7행)
  const headers =
    taxType === "TAXABLE"
      ? ["번호", "품명", "규격", "계약단가 (원)", "세액 (원)"]
      : ["번호", "품명", "규격", "계약단가 (원)"];

  const headerRow = 6;

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
  const dataStartRow = 7;
  const rowCount = 30;
  for (let r = dataStartRow; r < dataStartRow + rowCount; r++) {
    sheet.getRow(r).height = 20;

    // 번호 자동 기입
    sheet.getCell(r, 1).value = r - dataStartRow + 1;
    sheet.getCell(r, 1).alignment = { horizontal: "center", vertical: "middle" };
    sheet.getCell(r, 1).font = { size: 9, color: { argb: "FF9CA3AF" } };
    sheet.getCell(r, 1).fill = BOX_FILL;

    // 품명 (2열)
    sheet.getCell(r, 2).alignment = { horizontal: "left", vertical: "middle" };

    // 규격 (3열)
    sheet.getCell(r, 3).alignment = { horizontal: "center", vertical: "middle" };

    // 계약단가 (4열) - 수동 입력
    sheet.getCell(r, 4).alignment = { horizontal: "right", vertical: "middle" };
    sheet.getCell(r, 4).numFmt = "#,##0";

    // 과세인 경우 세액 (5열) - 수식 자동 계산
    if (taxType === "TAXABLE") {
      sheet.getCell(r, 5).value = { formula: `IF(D${r}="","",ROUND(D${r}*0.1,0))` };
      sheet.getCell(r, 5).alignment = { horizontal: "right", vertical: "middle" };
      sheet.getCell(r, 5).numFmt = "#,##0";
      sheet.getCell(r, 5).fill = BOX_FILL;
    }

    // 전체 열 테두리
    for (let c = 1; c <= colsCount; c++) {
      sheet.getCell(r, c).border = { top: THIN, left: THIN, right: THIN, bottom: THIN };
    }
  }

  // 열 너비 지정
  sheet.getColumn(1).width = 8;    // 번호
  sheet.getColumn(2).width = 28;   // 품명
  sheet.getColumn(3).width = 14;   // 규격
  sheet.getColumn(4).width = 18;   // 계약단가
  if (taxType === "TAXABLE") {
    sheet.getColumn(5).width = 16; // 세액
  }

  // A열(라벨) 너비: '사업자등록번호' 텍스트가 잘리지 않도록 확보
  // ExcelJS는 getColumn으로 이미 위에서 설정했으므로 열 1은 번호이며
  // 업체 정보 라벨은 동일 1번 열을 공유하기 때문에
  // 아래에서 다시 덮어써서 라벨 너비 우선 적용
  sheet.getColumn(1).width = 16;   // '사업자등록번호' 텍스트 너비 확보

  return workbook.xlsx.writeBuffer();
}
