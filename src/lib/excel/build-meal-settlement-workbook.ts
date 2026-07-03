import ExcelJS from "exceljs";

const THIN = { style: "thin" as const };
const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };

export async function buildMealSettlementWorkbook(params: {
  companyName: string;
  monthLabel: string;
  pricePerMeal: number;
  rows: {
    mealDate: string;
    restaurantLabel: string;
    submitterName: string;
    phone: string;
    submittedAt: string;
  }[];
}): Promise<ExcelJS.Buffer> {
  const { companyName, monthLabel, pricePerMeal, rows } = params;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("식수정산");

  const totalCols = 6;
  const total = rows.length * pricePerMeal;

  sheet.mergeCells(1, 1, 1, totalCols);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = `${companyName} 식수 정산 (${monthLabel})`;
  titleCell.font = { bold: true, size: 16 };
  titleCell.alignment = { horizontal: "center" };

  sheet.mergeCells(2, 1, 2, 2);
  sheet.getCell(2, 1).value = `1식 단가 : ${pricePerMeal.toLocaleString()}원`;
  sheet.mergeCells(2, 3, 2, 4);
  sheet.getCell(2, 3).value = `인원수 : ${rows.length}명`;
  sheet.mergeCells(2, 5, 2, 6);
  sheet.getCell(2, 5).value = `합계금액 : ${total.toLocaleString()}원`;

  const headerRow = 4;
  const headers = ["번호", "날짜", "식당", "이름", "연락처", "제출시각"];
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
      row.mealDate,
      row.restaurantLabel,
      row.submitterName,
      row.phone,
      row.submittedAt,
    ];
    values.forEach((value, c) => {
      sheet.getCell(rowIdx, c + 1).value = value;
    });
    for (let c = 1; c <= headers.length; c++) {
      sheet.getCell(rowIdx, c).border = { top: THIN, left: THIN, right: THIN, bottom: THIN };
    }
    rowIdx += 1;
  });

  if (rows.length === 0) {
    sheet.mergeCells(rowIdx, 1, rowIdx, totalCols);
    const emptyCell = sheet.getCell(rowIdx, 1);
    emptyCell.value = "등록된 식사가 없습니다.";
    emptyCell.alignment = { horizontal: "center" };
  }

  sheet.getColumn(1).width = 6;
  sheet.getColumn(2).width = 12;
  sheet.getColumn(3).width = 8;
  sheet.getColumn(4).width = 12;
  sheet.getColumn(5).width = 16;
  sheet.getColumn(6).width = 20;

  return workbook.xlsx.writeBuffer();
}
