import ExcelJS from "exceljs";

export type ParsedContractExcelItem = {
  itemName: string;
  unit: string;
  unitPrice: number;
  /** 과세 양식의 세액 열 값(단위당). 열이 없거나 비어 있으면 null. */
  taxAmount: number | null;
};

type ColumnField = "itemName" | "unit" | "unitPrice" | "taxAmount";

const COLUMN_ALIASES: Record<string, ColumnField> = {
  품명: "itemName",
  규격: "unit",
  단위: "unit",
  단가: "unitPrice",
  계약단가: "unitPrice",
  "계약단가(원)": "unitPrice",
  세액: "taxAmount",
  "세액(원)": "taxAmount",
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
  let v: unknown = cell.value;
  // 수식 셀(예: 세액 = 단가의 10%)은 엑셀이 저장해 둔 계산 결과를 읽는다.
  if (v !== null && typeof v === "object" && "formula" in v) {
    v = (v as { result?: unknown }).result;
  }
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v;
  const n = Number(String(v).replace(/[,₩원]/g, "").trim());
  return Number.isNaN(n) ? null : n;
}

export async function parseContractExcel(buffer: Buffer): Promise<ParsedContractExcelItem[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  let headerRowNumber: number | null = null;
  let columnMap: Partial<Record<ColumnField, number>> = {};

  // 헤더 매핑 행 탐색 (최대 30행)
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

  const items: ParsedContractExcelItem[] = [];
  for (let r = headerRowNumber + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const itemNameCell = columnMap.itemName ? row.getCell(columnMap.itemName) : null;
    const itemName = itemNameCell ? cellText(itemNameCell) : "";
    if (!itemName) continue;

    const unit = columnMap.unit ? cellText(row.getCell(columnMap.unit)) : "";
    const unitPrice = columnMap.unitPrice ? cellNumber(row.getCell(columnMap.unitPrice)) : null;
    const taxAmount = columnMap.taxAmount ? cellNumber(row.getCell(columnMap.taxAmount)) : null;

    items.push({
      itemName,
      unit,
      unitPrice: unitPrice ?? 0,
      taxAmount: taxAmount !== null && taxAmount >= 0 ? Math.round(taxAmount) : null,
    });
  }

  return items;
}
