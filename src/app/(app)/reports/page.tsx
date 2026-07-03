import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/categories";
import { parseDateRange, parseCategories } from "@/lib/report-period";
import ReportsVendorList from "@/components/reports/ReportsVendorList";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string; categories?: string | string[] }>;
}) {
  const sp = await searchParams;
  const { startDate, endDate, startStr, endStr } = parseDateRange(sp.start, sp.end);
  const categories = parseCategories(sp.categories);
  const categoriesParam = categories?.join(",");

  const session = await getSession();

  const vendorsWithSlips = await db.vendor.findMany({
    where: {
      deliverySlips: {
        some: {
          restaurant: session!.restaurant,
          status: "CONFIRMED",
          deliveryDate: { gte: startDate, lte: endDate },
        },
      },
    },
    include: {
      contracts: { orderBy: { startDate: "desc" }, take: 1, select: { category: true } },
    },
    orderBy: { name: "asc" },
  });

  // 카테고리별 분류 (선택된 카테고리만)
  const vendorsByCategory = new Map<string, typeof vendorsWithSlips>();
  const uncategorized: typeof vendorsWithSlips = [];
  for (const vendor of vendorsWithSlips) {
    const category = vendor.contracts[0]?.category;
    if (!category) {
      if (!categories) uncategorized.push(vendor);
      continue;
    }
    if (categories && !categories.includes(category)) continue;
    const arr = vendorsByCategory.get(category) ?? [];
    arr.push(vendor);
    vendorsByCategory.set(category, arr);
  }

  // 클라이언트에 전달할 벤더 목록 (직렬화 가능한 형태)
  const vendorListData = [
    ...CATEGORIES.flatMap((category) => {
      const vendors = vendorsByCategory.get(category) ?? [];
      return vendors.map((v) => ({ id: v.id, name: v.name, category: category as string }));
    }),
    ...uncategorized.map((v) => ({ id: v.id, name: v.name, category: "UNCATEGORIZED" })),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">기간별 납품보고서</h1>
        <p className="mt-1 text-sm text-gray-600">업체별 상세 보고서 또는 전체 통합 요약을 확인합니다.</p>
      </div>

      <form method="get" className="space-y-3 rounded-md border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">시작일</label>
            <input
              type="date"
              name="start"
              defaultValue={startStr}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">종료일</label>
            <input
              type="date"
              name="end"
              defaultValue={endStr}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded bg-primary-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            조회
          </button>
        </div>

        <div>
          <p className="mb-1 text-xs font-medium text-gray-600">카테고리</p>
          <div className="flex flex-wrap gap-3">
            {CATEGORIES.map((category) => (
              <label key={category} className="flex items-center gap-1.5 text-sm text-gray-700">
                <input
                  type="checkbox"
                  name="categories"
                  value={category}
                  defaultChecked={!categories || categories.includes(category)}
                  className="h-4 w-4 cursor-pointer accent-primary-600"
                />
                {CATEGORY_LABELS[category]}
              </label>
            ))}
          </div>
        </div>
      </form>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">
          {startStr === endStr ? startStr : `${startStr} ~ ${endStr}`} - 업체별 보고서
        </h2>
      </div>

      {vendorsWithSlips.length === 0 ? (
        <div className="rounded-md border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-400">
          해당 기간에 확정된 거래명세표가 없습니다.
        </div>
      ) : (
        /* 체크박스 + 통합보기 버튼은 Client Component로 위임 */
        <ReportsVendorList
          vendors={vendorListData}
          startStr={startStr}
          endStr={endStr}
          categoriesParam={categoriesParam}
        />
      )}
    </div>
  );
}
