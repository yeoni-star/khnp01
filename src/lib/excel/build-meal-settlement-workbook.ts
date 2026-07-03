import ExcelJS from "exceljs";

const THIN = { style: "thin" as const };
const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };

export async function buildMealSettlementWorkbook(params: {
  companyName: string;
  monthLabel: string;
  pricePerMeal: number;
  totalLunchCount: number;
  totalDinnerCount: number;
  summaryRows: {
    name: string;
    phone: string;
    lunchCount: number;
    dinnerCount: number;
    totalCount: number;
    totalAmount: number;
  }[];
  detailRows: {
    mealDate: string;
    mealTypeLabel: string;
    restaurantLabel: string;
    submitterName: string;
    phone: string;
    submittedAt: string;
  }[];
}): Promise<ExcelJS.Buffer> {
  const { companyName, monthLabel, pricePerMeal, totalLunchCount, totalDinnerCount, summaryRows, detailRows } = params;
  const workbook = new ExcelJS.Workbook();
  
  // ----------------------------------------------------
  // Sheet 1: 정산 요약 (Summary)
  // ----------------------------------------------------
  const sheet1 = workbook.addWorksheet("정산 요약");

  const totalCols1 = 7;
  const grandTotalCount = totalLunchCount + totalDinnerCount;
  const grandTotalAmount = grandTotalCount * pricePerMeal;

  sheet1.mergeCells(1, 1, 1, totalCols1);
  const titleCell1 = sheet1.getCell(1, 1);
  titleCell1.value = `${companyName} 식수 정산 요약 (${monthLabel})`;
  titleCell1.font = { bold: true, size: 16 };
  titleCell1.alignment = { horizontal: "center" };

  sheet1.mergeCells(2, 1, 2, 2);
  sheet1.getCell(2, 1).value = `1식 단가 : ${pricePerMeal.toLocaleString()}원`;
  
  sheet1.mergeCells(2, 3, 2, 5);
  sheet1.getCell(2, 3).value = `중식: ${totalLunchCount}명 / 석식: ${totalDinnerCount}명`;
  
  sheet1.mergeCells(2, 6, 2, 7);
  sheet1.getCell(2, 6).value = `총 합계 : ${grandTotalCount}명 / ${grandTotalAmount.toLocaleString()}원`;

  const headerRow1 = 4;
  const headers1 = ["번호", "이름", "연락처", "중식 이용", "석식 이용", "총 이용건수", "정산 합계"];
  headers1.forEach((label, i) => {
    const cell = sheet1.getCell(headerRow1, i + 1);
    cell.value = label;
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.fill = HEADER_FILL;
    cell.border = { top: THIN, left: THIN, right: THIN, bottom: THIN };
  });

  let rowIdx1 = headerRow1 + 1;
  summaryRows.forEach((row, i) => {
    const values: (string | number)[] = [
      i + 1,
      row.name,
      row.phone,
      `${row.lunchCount}회`,
      `${row.dinnerCount}회`,
      `${row.totalCount}건`,
      `${row.totalAmount.toLocaleString()}원`,
    ];
    values.forEach((value, c) => {
      const cell = sheet1.getCell(rowIdx1, c + 1);
      cell.value = value;
      if (c === 0 || c >= 3) {
        cell.alignment = { horizontal: "center" };
      }
      if (c === 6) {
        cell.alignment = { horizontal: "right" };
      }
    });
    for (let c = 1; c <= headers1.length; c++) {
      sheet1.getCell(rowIdx1, c).border = { top: THIN, left: THIN, right: THIN, bottom: THIN };
    }
    rowIdx1 += 1;
  });

  if (summaryRows.length === 0) {
    sheet1.mergeCells(rowIdx1, 1, rowIdx1, totalCols1);
    const emptyCell = sheet1.getCell(rowIdx1, 1);
    emptyCell.value = "해당 기간에 등록된 식사가 없습니다.";
    emptyCell.alignment = { horizontal: "center" };
  }

  sheet1.getColumn(1).width = 6;
  sheet1.getColumn(2).width = 12;
  sheet1.getColumn(3).width = 16;
  sheet1.getColumn(4).width = 12;
  sheet1.getColumn(5).width = 12;
  sheet1.getColumn(6).width = 12;
  sheet1.getColumn(7).width = 16;

  // ----------------------------------------------------
  // Sheet 2: 상세 내역 (Detail List)
  // ----------------------------------------------------
  const sheet2 = workbook.addWorksheet("상세 내역");

  const totalCols2 = 7;
  sheet2.mergeCells(1, 1, 1, totalCols2);
  const titleCell2 = sheet2.getCell(1, 1);
  titleCell2.value = `${companyName} 식수 상세 내역 (${monthLabel})`;
  titleCell2.font = { bold: true, size: 16 };
  titleCell2.alignment = { horizontal: "center" };

  const headerRow2 = 3;
  const headers2 = ["번호", "이름", "연락처", "날짜", "구분", "식당", "제출시각"];
  headers2.forEach((label, i) => {
    const cell = sheet2.getCell(headerRow2, i + 1);
    cell.value = label;
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.fill = HEADER_FILL;
    cell.border = { top: THIN, left: THIN, right: THIN, bottom: THIN };
  });

  let rowIdx2 = headerRow2 + 1;
  detailRows.forEach((row, i) => {
    const values: (string | number)[] = [
      i + 1,
      row.submitterName,
      row.phone,
      row.mealDate,
      row.mealTypeLabel,
      row.restaurantLabel,
      row.submittedAt,
    ];
    values.forEach((value, c) => {
      const cell = sheet2.getCell(rowIdx2, c + 1);
      cell.value = value;
      cell.alignment = { horizontal: "center" };
    });
    for (let c = 1; c <= headers2.length; c++) {
      sheet2.getCell(rowIdx2, c).border = { top: THIN, left: THIN, right: THIN, bottom: THIN };
    }
    rowIdx2 += 1;
  });

  if (detailRows.length === 0) {
    sheet2.mergeCells(rowIdx2, 1, rowIdx2, totalCols2);
    const emptyCell = sheet2.getCell(rowIdx2, 1);
    emptyCell.value = "해당 기간에 등록된 식사가 없습니다.";
    emptyCell.alignment = { horizontal: "center" };
  }

  sheet2.getColumn(1).width = 6;
  sheet2.getColumn(2).width = 12;
  sheet2.getColumn(3).width = 16;
  sheet2.getColumn(4).width = 12;
  sheet2.getColumn(5).width = 8;
  sheet2.getColumn(6).width = 8;
  sheet2.getColumn(7).width = 20;

  return workbook.xlsx.writeBuffer();
}
