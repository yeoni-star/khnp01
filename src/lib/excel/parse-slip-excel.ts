import ExcelJS from "exceljs";

export type ParsedSlipExcelItem = {
  itemName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxAmount: number | null;
};

type ColumnField = "itemName" | "unit" | "quantity" | "unitPrice" | "amount" | "taxAmount";

const COLUMN_ALIASES: Record<string, ColumnField> = {
  품명: "itemName",
  규격: "unit",
  단위: "unit",
  수량: "quantity",
  단가: "unitPrice",
  공급가액: "amount",
  금액: "amount",
  세액: "taxAmount",
  부가세: "taxAmount",
};

function cellText(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && "richText" in v) {
    return (v as ExcelJS.CellRichTextValue).richText.map((t) => t.text).join("");
  }
  return String(v).trim();
}

function cellNumber(cell: ExcelJS.Cell): number | null {
  const v = cell.value;
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v;
  const n = Number(String(v).replace(/[,₩원]/g, "").trim());
  return Number.isNaN(n) ? null : n;
}

export async function parseSlipExcel(buffer: Buffer): Promise<ParsedSlipExcelItem[]> {
  const workbook = new ExcelJS.Workbook();
  // exceljs declares its own ambient `Buffer` (extends ArrayBuffer) that clashes with @types/node's Buffer at the type level only; runtime accepts a Node Buffer fine.
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  let headerRowNumber: number | null = null;
  let columnMap: Partial<Record<ColumnField, number>> = {};

  for (let r = 1; r <= Math.min(sheet.rowCount, 30); r++) {
    const row = sheet.getRow(r);
    const map: Partial<Record<ColumnField, number>> = {};
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const text = cellText(cell).replace(/\s/g, "");
      const field = COLUMN_ALIASES[text];
      if (field) map[field] = colNumber;
    });
    if (map.itemName) {
      headerRowNumber = r;
      columnMap = map;
      break;
    }
  }

  if (headerRowNumber === null) return [];

  const items: ParsedSlipExcelItem[] = [];
  for (let r = headerRowNumber + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const itemNameCell = columnMap.itemName ? row.getCell(columnMap.itemName) : null;
    const itemName = itemNameCell ? cellText(itemNameCell) : "";
    if (!itemName) continue;

    const unit = columnMap.unit ? cellText(row.getCell(columnMap.unit)) : "";
    const quantity = columnMap.quantity ? cellNumber(row.getCell(columnMap.quantity)) : null;
    const unitPrice = columnMap.unitPrice ? cellNumber(row.getCell(columnMap.unitPrice)) : null;
    const rawAmount = columnMap.amount ? cellNumber(row.getCell(columnMap.amount)) : null;
    const taxAmount = columnMap.taxAmount ? cellNumber(row.getCell(columnMap.taxAmount)) : null;

    const q = quantity ?? 0;
    const p = unitPrice ?? 0;
    const amount = rawAmount ?? Math.round(q * p);

    items.push({ itemName, unit, quantity: q, unitPrice: p, amount, taxAmount });
  }

  return items;
}
