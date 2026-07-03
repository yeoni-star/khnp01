import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { buildSlipImportTemplate, SLIP_IMPORT_HEADER_ROW } from "./build-slip-import-template";
import { parseSlipExcel } from "./parse-slip-excel";

async function fillTemplateRow(
  buffer: ExcelJS.Buffer,
  values: (string | number)[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  const row = sheet.getRow(SLIP_IMPORT_HEADER_ROW + 1);
  values.forEach((v, i) => {
    row.getCell(i + 1).value = v;
  });
  row.commit();
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe("buildSlipImportTemplate / parseSlipExcel", () => {
  it("과세 양식: 세액을 비워두면 공급가액의 10%로 채워진 것으로 다시 계산할 수 있는 원시값을 돌려준다", async () => {
    const template = await buildSlipImportTemplate("TAXABLE");
    const filled = await fillTemplateRow(template, [1, "식용유", "", 5, 46200, "", ""]);

    const items = await parseSlipExcel(filled);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      itemName: "식용유",
      quantity: 5,
      unitPrice: 46200,
      amount: 231000,
      taxAmount: null,
    });
  });

  it("과세 양식: 세액을 직접 입력하면 그대로 읽어온다", async () => {
    const template = await buildSlipImportTemplate("TAXABLE");
    const filled = await fillTemplateRow(template, [1, "식초", "box", 2, 20900, 41800, 4180]);

    const items = await parseSlipExcel(filled);
    expect(items[0]).toMatchObject({ itemName: "식초", amount: 41800, taxAmount: 4180 });
  });

  it("면세 양식: 세액 컬럼이 없어도 정상 파싱된다", async () => {
    const template = await buildSlipImportTemplate("EXEMPT");
    const filled = await fillTemplateRow(template, [1, "쌀", "kg", 20, 2500]);

    const items = await parseSlipExcel(filled);
    expect(items[0]).toMatchObject({ itemName: "쌀", quantity: 20, unitPrice: 2500, amount: 50000, taxAmount: null });
  });

  it("품명이 비어있는 행은 건너뛴다", async () => {
    const template = await buildSlipImportTemplate("TAXABLE");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(template as unknown as ExcelJS.Buffer);
    const sheet = workbook.worksheets[0];
    sheet.getRow(SLIP_IMPORT_HEADER_ROW + 1).getCell(2).value = "";
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const items = await parseSlipExcel(buffer);
    expect(items).toHaveLength(0);
  });
});
