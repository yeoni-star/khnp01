import { db } from "@/lib/db";
import ExportCsvButton from "../unmatched-items/ExportCsvButton";
import { getSession } from "@/lib/session";
import { buildQuantityReport } from "@/lib/quantity-aggregate";
import { CATEGORIES, CATEGORY_LABELS, type CategoryCode } from "@/lib/categories";
import { TAX_TYPES, TAX_TYPE_LABELS, isTaxTypeCode } from "@/lib/tax";
import { RESTAURANT_LABELS } from "@/lib/restaurants";

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
  searchParams: Promise<{
    start?: string;
    end?: string;
    vendorId?: string;
    category?: string;
    restaurant?: string;
    taxType?: string;
  }>;
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
  const restaurant = (params.restaurant === "A" || params.restaurant === "B")
    ? params.restaurant
    : "ALL";
  const taxType = params.taxType && isTaxTypeCode(params.taxType) ? params.taxType : undefined;

  const session = await getSession();
  const vendors = await db.vendor.findMany({ orderBy: { name: "asc" } });

  const rows = await buildQuantityReport(
    restaurant,
    new Date(`${start}T00:00:00.000Z`),
    new Date(`${end}T23:59:59.999Z`),
    { vendorId: vendorId || undefined, category, taxType }
  );

  const exportData = rows.map((r, index) => ({
    순번: index + 1,
    식당: RESTAURANT_LABELS[r.restaurant],
    품명: r.itemName,
    카테고리: r.category ? CATEGORY_LABELS[r.category] : "-",
    단위: r.unit,
    "면세/과세": TAX_TYPE_LABELS[r.taxType],
    "기간 내 총수량": r.totalQuantity,
  }));

  const restaurantLabel = restaurant === "A" ? "본관" : restaurant === "B" ? "후문" : "전체";

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
        className="grid grid-cols-2 gap-3 rounded-md border border-gray-200 bg-white p-4 sm:grid-cols-6"
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
          <label className="mb-1 block text-xs font-medium text-gray-600">식당</label>
          <select
            name="restaurant"
            defaultValue={restaurant}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="ALL">전체</option>
            <option value="A">본관</option>
            <option value="B">후문</option>
          </select>
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
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">면세/과세</label>
          <select
            name="taxType"
            defaultValue={taxType ?? ""}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="">전체</option>
            {TAX_TYPES.map((t) => (
              <option key={t} value={t}>
                {TAX_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2 flex flex-wrap items-center gap-2 sm:col-span-6">
          <button
            type="submit"
            className="rounded bg-primary-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-700 cursor-pointer"
          >
            조회
          </button>
          <ExportCsvButton data={exportData} filename={`소요수량산출_${restaurantLabel}_${start}_${end}.csv`} />
          <a
            href={`/api/templates/estimate-excel?start=${start}&end=${end}&vendorId=${vendorId}&category=${category ?? ""}&restaurant=${restaurant}&taxType=TAXABLE`}
            className="rounded border border-primary-300 bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-700 hover:bg-primary-100 transition"
          >
            📄 과세 견적서 다운로드
          </a>
          <a
            href={`/api/templates/estimate-excel?start=${start}&end=${end}&vendorId=${vendorId}&category=${category ?? ""}&restaurant=${restaurant}&taxType=EXEMPT`}
            className="rounded border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition"
          >
            📄 면세 견적서 다운로드
          </a>
        </div>
      </form>

      <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500">
            <tr>
              <th className="px-4 py-2 text-center w-16">순번</th>
              <th className="px-4 py-2">식당</th>
              <th className="px-4 py-2">품명</th>
              <th className="px-4 py-2">카테고리</th>
              <th className="px-4 py-2">단위</th>
              <th className="px-4 py-2">면세/과세</th>
              <th className="px-4 py-2">기간 내 총수량</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, index) => (
              <tr key={`${row.itemName}-${row.unit}-${row.taxType}-${row.restaurant}`}>
                <td className="px-4 py-2 text-center text-gray-500">{index + 1}</td>
                <td className="px-4 py-2 text-gray-600">{RESTAURANT_LABELS[row.restaurant]}</td>
                <td className="px-4 py-2 font-medium text-gray-900">{row.itemName}</td>
                <td className="px-4 py-2 text-gray-600">{row.category ? CATEGORY_LABELS[row.category] : "-"}</td>
                <td className="px-4 py-2 text-gray-600">{row.unit}</td>
                <td className="px-4 py-2 text-gray-600">{TAX_TYPE_LABELS[row.taxType]}</td>
                <td className="px-4 py-2 text-gray-600">{row.totalQuantity.toLocaleString()}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
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
