import ExcelJS from "exceljs";

const THIN = { style: "thin" as const };
const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };

export async function buildMealSettlementWorkbook(params: {
  companyName: string;
  monthLabel: string;
  pricePerMeal: number;
  totalLunchCount: number;
  totalDinnerCount: number;
  rows: {
    name: string;
    phone: string;
    lunchCount: number;
    dinnerCount: number;
    totalCount: number;
    totalAmount: number;
    detailStr: string;
  }[];
}): Promise<ExcelJS.Buffer> {
  const { companyName, monthLabel, pricePerMeal, totalLunchCount, totalDinnerCount, rows } = params;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("식수정산");

  const totalCols = 8;
  const grandTotalCount = totalLunchCount + totalDinnerCount;
  const grandTotalAmount = grandTotalCount * pricePerMeal;

  sheet.mergeCells(1, 1, 1, totalCols);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = `${companyName} 식수 정산 (${monthLabel})`;
  titleCell.font = { bold: true, size: 16 };
  titleCell.alignment = { horizontal: "center" };

  sheet.mergeCells(2, 1, 2, 2);
  sheet.getCell(2, 1).value = `1식 단가 : ${pricePerMeal.toLocaleString()}원`;
  
  sheet.mergeCells(2, 3, 2, 5);
  sheet.getCell(2, 3).value = `중식: ${totalLunchCount}명 / 석식: ${totalDinnerCount}명`;
  
  sheet.mergeCells(2, 6, 2, 8);
  sheet.getCell(2, 6).value = `총 합계 : ${grandTotalCount}명 / ${grandTotalAmount.toLocaleString()}원`;

  const headerRow = 4;
  const headers = ["번호", "이름", "연락처", "이용 상세내역", "중식 이용", "석식 이용", "총 이용건수", "정산 합계"];
  headers.forEach((label, i) => {
    const cell = sheet.getCell(headerRow, i + 1);
    cell.value = label;
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.fill = HEADER_FILL;
    cell.border = { top: THIN, left: THIN, right: THIN, bottom: THIN };
  });

  let rowIdx = headerRow + 1;
  rows.forEach((row, i) => {
    const values: (string | number)[] = [
      i + 1,
      row.name,
      row.phone,
      row.detailStr,
      `${row.lunchCount}회`,
      `${row.dinnerCount}회`,
      `${row.totalCount}건`,
      `${row.totalAmount.toLocaleString()}원`,
    ];
    values.forEach((value, c) => {
      const cell = sheet.getCell(rowIdx, c + 1);
      cell.value = value;
      if (c === 0 || c >= 4) {
        cell.alignment = { horizontal: "center" };
      }
      if (c === 7) {
        cell.alignment = { horizontal: "right" };
      }
    });
    for (let c = 1; c <= headers.length; c++) {
      sheet.getCell(rowIdx, c).border = { top: THIN, left: THIN, right: THIN, bottom: THIN };
    }
    rowIdx += 1;
  });

  if (rows.length === 0) {
    sheet.mergeCells(rowIdx, 1, rowIdx, totalCols);
    const emptyCell = sheet.getCell(rowIdx, 1);
    emptyCell.value = "해당 기간에 등록된 식사가 없습니다.";
    emptyCell.alignment = { horizontal: "center" };
  }

  sheet.getColumn(1).width = 6;
  sheet.getColumn(2).width = 12;
  sheet.getColumn(3).width = 16;
  sheet.getColumn(4).width = 12;
  sheet.getColumn(5).width = 12;
  sheet.getColumn(6).width = 12;
  sheet.getColumn(7).width = 16;

  return workbook.xlsx.writeBuffer();
}
