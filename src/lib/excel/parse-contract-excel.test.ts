import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { parseContractExcel } from "./parse-contract-excel";

async function buildWorkbook(headers: string[], rows: ExcelJS.CellValue[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("단가표");
  sheet.addRow(["계약 단가표"]);
  sheet.addRow(headers);
  for (const row of rows) sheet.addRow(row);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe("parseContractExcel 세액 열", () => {
  it("과세 양식의 세액 열 값을 읽는다(숫자 입력 / 수식 결과 / 빈 칸)", async () => {
    const buffer = await buildWorkbook(
      ["번호", "품명", "규격", "계약단가 (원)", "세액 (원)"],
      [
        [1, "양파", "kg", 1000, 90],
        [2, "대파", "kg", 2000, { formula: "ROUND(D4*0.1,0)", result: 200 }],
        [3, "무", "kg", 1500, null],
      ]
    );
    const items = await parseContractExcel(buffer);
    expect(items.map((i) => [i.itemName, i.unitPrice, i.taxAmount])).toEqual([
      ["양파", 1000, 90],
      ["대파", 2000, 200],
      ["무", 1500, null],
    ]);
  });

  it("면세 양식(세액 열 없음)은 세액을 null로 둔다", async () => {
    const buffer = await buildWorkbook(["번호", "품명", "규격", "계약단가 (원)"], [[1, "쌀", "20kg", 55000]]);
    const items = await parseContractExcel(buffer);
    expect(items).toEqual([{ itemName: "쌀", unit: "20kg", unitPrice: 55000, taxAmount: null }]);
  });
});
