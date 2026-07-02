import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { CATEGORY_LABELS, type CategoryCode } from "@/lib/categories";

export default async function UnmatchedItemsPage() {
  const session = await getSession();
  const items = await db.deliverySlipItem.findMany({
    where: {
      matchType: "NONE",
      slip: { restaurant: session!.restaurant },
    },
    include: { slip: { include: { vendor: true } } },
    orderBy: { createdAt: "desc" },
  });

  const grouped = new Map<
    string,
    { itemName: string; category: CategoryCode | null; count: number; vendors: Set<string> }
  >();
  for (const item of items) {
    const key = item.itemName.trim().toLowerCase();
    const entry = grouped.get(key) ?? {
      itemName: item.itemName,
      category: item.category,
      count: 0,
      vendors: new Set<string>(),
    };
    entry.count += 1;
    entry.vendors.add(item.slip.vendor.name);
    grouped.set(key, entry);
  }

  const rows = Array.from(grouped.values());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">미등록 품목</h1>
        <p className="mt-1 text-sm text-gray-600">
          계약 단가표에 없어 유사매칭도 확인되지 않은 품목입니다. 계약에 정식 등록할지 검토해 주세요.
        </p>
      </div>

      <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500">
            <tr>
              <th className="px-4 py-2">품명</th>
              <th className="px-4 py-2">카테고리</th>
              <th className="px-4 py-2">업체</th>
              <th className="px-4 py-2">등장 횟수</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.itemName}>
                <td className="px-4 py-2 font-medium text-gray-900">{row.itemName}</td>
                <td className="px-4 py-2 text-gray-600">
                  {row.category ? CATEGORY_LABELS[row.category] : "-"}
                </td>
                <td className="px-4 py-2 text-gray-600">{Array.from(row.vendors).join(", ")}</td>
                <td className="px-4 py-2 text-gray-600">{row.count}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  미등록 품목이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
