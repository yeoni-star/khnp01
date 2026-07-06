import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { isTaxTypeCode } from "@/lib/tax";
import { buildQuantityReport } from "@/lib/quantity-aggregate";
import { type CategoryCode, CATEGORY_LABELS, isCategoryCode } from "@/lib/categories";
import { type RestaurantCode } from "@/lib/restaurants";
import ExcelJS from "exceljs";

const THIN = { style: "thin" as const };
const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
const BOX_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };

export async function GET(request: NextRequest) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);

    const start = searchParams.get("start") ?? "";
    const end = searchParams.get("end") ?? "";
    const vendorId = searchParams.get("vendorId") ?? "";
    const category = searchParams.get("category") as CategoryCode | undefined;
    const restaurant = (searchParams.get("restaurant") === "A" || searchParams.get("restaurant") === "B")
      ? (searchParams.get("restaurant") as RestaurantCode)
      : "ALL";
    const taxType = searchParams.get("taxType") ?? "TAXABLE";

    if (!isTaxTypeCode(taxType)) {
      return NextResponse.json({ message: "잘못된 taxType 입니다." }, { status: 400 });
    }

    if (!start || !end) {
      return NextResponse.json({ message: "시작일과 종료일이 누락되었습니다." }, { status: 400 });
    }

    // 1. 조회 필터 조건에 맞춰 소요수량 쿼리 실행
    const rows = await buildQuantityReport(
      restaurant,
      new Date(`${start}T00:00:00.000Z`),
      new Date(`${end}T23:59:59.999Z`),
      { vendorId: vendorId || undefined, category, taxType }
    );

    // 2. ExcelJS Workbook 생성
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("견적단가표");
    sheet.views = [{ showGridLines: true }];

    const colsCount = taxType === "TAXABLE" ? 7 : 6;

    // 2.1 대제목 (카테고리 선택 시 카테고리명 접두)
    const categoryLabel = category && isCategoryCode(category) ? CATEGORY_LABELS[category] : "";
    const titlePrefix = categoryLabel ? `${categoryLabel} ` : "";
    const titleCell = sheet.getCell(1, 1);
    titleCell.value = `${titlePrefix}견적서 및 소요단가표 (${taxType === "TAXABLE" ? "과세" : "면세"})`;
    titleCell.font = { bold: true, size: 15, color: { argb: "FF111827" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(1).height = 40;
    sheet.mergeCells(1, 1, 1, colsCount);

    // 2.2 안내 문구
    const noteCell = sheet.getCell(2, 1);
    noteCell.value = "※ 소요수량을 바탕으로 공급가액을 기입해 주시기 바랍니다. (세액 및 합계금액은 자동 계산됩니다)";
    noteCell.font = { size: 9, color: { argb: "FF4B5563" }, italic: true };
    noteCell.alignment = { horizontal: "left", vertical: "middle" };
    sheet.getRow(2).height = 20;
    sheet.mergeCells(2, 1, 2, colsCount);

    // 2.3 업체 및 직인 서식 박스 (3~4행으로 축소 - 산출기간 제거)
    // [A3] 업체명
    sheet.getCell(3, 1).value = "업 체 명";
    sheet.getCell(3, 1).font = { bold: true, size: 9 };
    sheet.getCell(3, 1).alignment = { horizontal: "center", vertical: "middle" };
    sheet.getCell(3, 1).fill = HEADER_FILL;
    sheet.getCell(3, 1).border = { top: THIN, left: THIN, bottom: THIN, right: THIN };

    sheet.getCell(3, 2).value = "";
    sheet.getCell(3, 2).border = { top: THIN, left: THIN, bottom: THIN, right: THIN };

    // [A4] 사업자등록번호
    sheet.getCell(4, 1).value = "사업자등록번호";
    sheet.getCell(4, 1).font = { bold: true, size: 9 };
    sheet.getCell(4, 1).alignment = { horizontal: "center", vertical: "middle" };
    sheet.getCell(4, 1).fill = HEADER_FILL;
    sheet.getCell(4, 1).border = { top: THIN, left: THIN, bottom: THIN, right: THIN };

    sheet.getCell(4, 2).value = "";
    sheet.getCell(4, 2).border = { top: THIN, left: THIN, bottom: THIN, right: THIN };

    // [A5] 견적일 라벨
    sheet.getCell(5, 1).value = "견 적 일";
    sheet.getCell(5, 1).font = { bold: true, size: 9 };
    sheet.getCell(5, 1).alignment = { horizontal: "center", vertical: "middle" };
    sheet.getCell(5, 1).fill = HEADER_FILL;
    sheet.getCell(5, 1).border = { top: THIN, left: THIN, bottom: THIN, right: THIN };

    // [B5] 견적일 기입란 (오늘 날짜를 기본값으로)
    const today = new Date().toISOString().slice(0, 10);
    sheet.getCell(5, 2).value = today;
    sheet.getCell(5, 2).alignment = { horizontal: "left", vertical: "middle" };
    sheet.getCell(5, 2).border = { top: THIN, left: THIN, bottom: THIN, right: THIN };

    // [C3:D5] 직인란 구성 (3~5행)
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

    for (let r = 3; r <= 5; r++) {
      for (let c = 3; c <= 4; c++) {
        sheet.getCell(r, c).border = { top: THIN, left: THIN, bottom: THIN, right: THIN };
      }
    }

    sheet.getRow(3).height = 20;
    sheet.getRow(4).height = 20;
    sheet.getRow(5).height = 20;

    // 2.4 데이터 테이블 시작 (7행 헤더, 8행 데이터 시작)
    const headers = taxType === "TAXABLE"
      ? ["번호", "품명", "단위", "소요수량", "공급가액", "합계금액", "세액"]
      : ["번호", "품명", "단위", "소요수량", "단가(공급가액)", "합계"];

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

    // 2.5 데이터 행 채우기 (8행부터)
    const dataStartRow = 8;
    rows.forEach((row, index) => {
      const r = dataStartRow + index;
      sheet.getRow(r).height = 20;

      // 1. 번호
      sheet.getCell(r, 1).value = index + 1;
      sheet.getCell(r, 1).alignment = { horizontal: "center", vertical: "middle" };
      sheet.getCell(r, 1).font = { size: 9, color: { argb: "FF9CA3AF" } };
      sheet.getCell(r, 1).fill = BOX_FILL;

      // 2. 품명
      sheet.getCell(r, 2).value = row.itemName;
      sheet.getCell(r, 2).alignment = { horizontal: "left", vertical: "middle" };

      // 3. 규격 -> 단위
      sheet.getCell(r, 3).value = row.unit || "-";
      sheet.getCell(r, 3).alignment = { horizontal: "center", vertical: "middle" };

      // 4. 소요수량
      sheet.getCell(r, 4).value = row.totalQuantity;
      sheet.getCell(r, 4).alignment = { horizontal: "right", vertical: "middle" };
      sheet.getCell(r, 4).numFmt = "#,##0.##";

      // 5. 공급가액 (비워둠, 직접 입력용)
      sheet.getCell(r, 5).value = "";
      sheet.getCell(r, 5).alignment = { horizontal: "right", vertical: "middle" };
      sheet.getCell(r, 5).numFmt = "#,##0";

      if (taxType === "TAXABLE") {
        // 6. 합계금액 (소요수량 x 공급가액(단가))
        sheet.getCell(r, 6).value = { formula: `IF(E${r}="","",D${r}*E${r})` };
        sheet.getCell(r, 6).alignment = { horizontal: "right", vertical: "middle" };
        sheet.getCell(r, 6).numFmt = "#,##0";
        sheet.getCell(r, 6).fill = BOX_FILL;

        // 7. 세액 (합계금액의 10%)
        sheet.getCell(r, 7).value = { formula: `IF(F${r}="","",ROUND(F${r}*0.1,0))` };
        sheet.getCell(r, 7).alignment = { horizontal: "right", vertical: "middle" };
        sheet.getCell(r, 7).numFmt = "#,##0";
        sheet.getCell(r, 7).fill = BOX_FILL;
      } else {
        // 6. 합계 (단가 x 소요수량)
        sheet.getCell(r, 6).value = { formula: `IF(E${r}="","",D${r}*E${r})` };
        sheet.getCell(r, 6).alignment = { horizontal: "right", vertical: "middle" };
        sheet.getCell(r, 6).numFmt = "#,##0";
        sheet.getCell(r, 6).fill = BOX_FILL;
      }

      // 테두리 설정
      for (let c = 1; c <= colsCount; c++) {
        sheet.getCell(r, c).border = { top: THIN, left: THIN, right: THIN, bottom: THIN };
      }
    });

    // 2.6 합계 요약 행 추가 (맨 아래에 총합계 추가)
    if (rows.length > 0) {
      const summaryRow = dataStartRow + rows.length;
      sheet.getRow(summaryRow).height = 24;

      sheet.mergeCells(summaryRow, 1, summaryRow, 3);
      const summaryLabel = sheet.getCell(summaryRow, 1);
      summaryLabel.value = "합 계 (수식 자동 계산)";
      summaryLabel.font = { bold: true, size: 10 };
      summaryLabel.alignment = { horizontal: "center", vertical: "middle" };
      summaryLabel.fill = HEADER_FILL;

      // 소요수량 합계 (데이터는 8행부터 시작)
      sheet.getCell(summaryRow, 4).value = { formula: `SUM(D${dataStartRow}:D${summaryRow - 1})` };
      sheet.getCell(summaryRow, 4).alignment = { horizontal: "right", vertical: "middle" };
      sheet.getCell(summaryRow, 4).font = { bold: true };
      sheet.getCell(summaryRow, 4).numFmt = "#,##0.##";
      sheet.getCell(summaryRow, 4).fill = HEADER_FILL;

      if (taxType === "TAXABLE") {
        // 합계금액 합계 (F열)
        sheet.getCell(summaryRow, 6).value = { formula: `SUM(F${dataStartRow}:F${summaryRow - 1})` };
        sheet.getCell(summaryRow, 6).alignment = { horizontal: "right", vertical: "middle" };
        sheet.getCell(summaryRow, 6).font = { bold: true };
        sheet.getCell(summaryRow, 6).numFmt = "#,##0";
        sheet.getCell(summaryRow, 6).fill = HEADER_FILL;

        // 세액 합계 (G열)
        sheet.getCell(summaryRow, 7).value = { formula: `SUM(G${dataStartRow}:G${summaryRow - 1})` };
        sheet.getCell(summaryRow, 7).alignment = { horizontal: "right", vertical: "middle" };
        sheet.getCell(summaryRow, 7).font = { bold: true };
        sheet.getCell(summaryRow, 7).numFmt = "#,##0";
        sheet.getCell(summaryRow, 7).fill = HEADER_FILL;
      } else {
        // 단가(E열)는 합산하지 않고, 합계(F열)만 합산
        sheet.getCell(summaryRow, 6).value = { formula: `SUM(F${dataStartRow}:F${summaryRow - 1})` };
        sheet.getCell(summaryRow, 6).alignment = { horizontal: "right", vertical: "middle" };
        sheet.getCell(summaryRow, 6).font = { bold: true };
        sheet.getCell(summaryRow, 6).numFmt = "#,##0";
        sheet.getCell(summaryRow, 6).fill = HEADER_FILL;
      }

      for (let c = 1; c <= colsCount; c++) {
        sheet.getCell(summaryRow, c).border = { top: THIN, left: THIN, right: THIN, bottom: THIN };
      }
    }

    // 2.7 열 너비 세팅
    // 업체정보 헤더(A열)는 '사업자등록번호' 글자가 들어가므로 넉넉하게
    sheet.getColumn(1).width = 16;  // 번호/업체라벨 (사업자등록번호 텍스트 수용)
    sheet.getColumn(2).width = 32;  // 품명/업체입력칸
    sheet.getColumn(3).width = 14;  // 규격/직인라벨
    sheet.getColumn(4).width = 14;  // 소요수량/직인박스
    sheet.getColumn(5).width = 18;  // 공급가액 / 단가(공급가액)
    if (taxType === "TAXABLE") {
      sheet.getColumn(6).width = 20;  // 합계금액
      sheet.getColumn(7).width = 16;  // 세액
    } else {
      sheet.getColumn(6).width = 20;  // 합계
    }

    // 3. 파일 생성 및 전송
    const buffer = await workbook.xlsx.writeBuffer();
    const restaurantLabel = restaurant === "A" ? "본관" : restaurant === "B" ? "후문" : "전체";
    const filename = encodeURIComponent(
      `견적의뢰서_${restaurantLabel}_${taxType === "TAXABLE" ? "과세" : "면세"}_${start}_${end}.xlsx`
    );

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="estimate_request.xlsx"; filename*=UTF-8''${filename}`,
      },
    });
  } catch (error: any) {
    console.error("Estimate request template API error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
