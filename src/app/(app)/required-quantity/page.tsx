import { db } from "@/lib/db";
import ExportCsvButton from "../unmatched-items/ExportCsvButton";
import { getSession } from "@/lib/session";
import { buildQuantityReport } from "@/lib/quantity-aggregate";
import { CATEGORIES, CATEGORY_LABELS, type CategoryCode } from "@/lib/categories";

function defaultRange() {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 6);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export default async function RequiredQuantityPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string; vendorId?: string; category?: string }>;
}) {
  const params = await searchParams;
  const { start: defaultStart, end: defaultEnd } = defaultRange();
  const start = params.start || defaultStart;
  const end = params.end || defaultEnd;
  const vendorId = params.vendorId || "";
  const category =
    params.category && (CATEGORIES as readonly string[]).includes(params.category)
      ? (params.category as CategoryCode)
      : undefined;

  const session = await getSession();
  const vendors = await db.vendor.findMany({ orderBy: { name: "asc" } });

  const rows = await buildQuantityReport(
    session!.restaurant,
    new Date(`${start}T00:00:00.000Z`),
    new Date(`${end}T23:59:59.999Z`),
    { vendorId: vendorId || undefined, category }
  );

  const exportData = rows.map((r) => ({
    품명: r.itemName,
    카테고리: r.category ? CATEGORY_LABELS[r.category] : "-",
    단위: r.unit,
    "기간 내 총수량": r.totalQuantity,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">소요수량 산출</h1>
        <p className="mt-1 text-sm text-gray-600">
          지정한 기간의 납품 수량 합계를 품목별로 집계합니다. 계약 갱신 시 소요수량 산정에 참고하세요.
        </p>
      </div>

      <form
        method="get"
        className="grid grid-cols-2 gap-3 rounded-md border border-gray-200 bg-white p-4 sm:grid-cols-4"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">시작일</label>
          <input
            type="date"
            name="start"
            defaultValue={start}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">종료일</label>
          <input
            type="date"
            name="end"
            defaultValue={end}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">업체</label>
          <select
            name="vendorId"
            defaultValue={vendorId}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="">전체</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">카테고리</label>
          <select
            name="category"
            defaultValue={category ?? ""}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="">전체</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2 flex items-center gap-2 sm:col-span-4">
          <button
            type="submit"
            className="rounded bg-primary-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            조회
          </button>
          <ExportCsvButton data={exportData} filename={`소요수량산출_${start}_${end}.csv`} />
        </div>
      </form>

      <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500">
            <tr>
              <th className="px-4 py-2">품명</th>
              <th className="px-4 py-2">카테고리</th>
              <th className="px-4 py-2">단위</th>
              <th className="px-4 py-2">기간 내 총수량</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={`${row.itemName}-${row.unit}`}>
                <td className="px-4 py-2 font-medium text-gray-900">{row.itemName}</td>
                <td className="px-4 py-2 text-gray-600">{row.category ? CATEGORY_LABELS[row.category] : "-"}</td>
                <td className="px-4 py-2 text-gray-600">{row.unit}</td>
                <td className="px-4 py-2 text-gray-600">{row.totalQuantity.toLocaleString()}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  해당 기간에 확정된 납품 내역이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
