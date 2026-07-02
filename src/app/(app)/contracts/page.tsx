import Link from "next/link";
import { db } from "@/lib/db";
import { RESTAURANT_LABELS } from "@/lib/restaurants";

export default async function ContractsPage() {
  const contracts = await db.contract.findMany({
    orderBy: { startDate: "desc" },
    include: { vendor: true, _count: { select: { items: true } } },
  });
  const today = new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">계약/단가표 관리</h1>
          <p className="mt-1 text-sm text-gray-600">업체별 계약기간과 품목 단가표를 관리합니다.</p>
        </div>
        <Link
          href="/contracts/new"
          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          새 계약 등록
        </Link>
      </div>

      <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500">
            <tr>
              <th className="px-4 py-2">식당</th>
              <th className="px-4 py-2">업체</th>
              <th className="px-4 py-2">계약기간</th>
              <th className="px-4 py-2">품목 수</th>
              <th className="px-4 py-2">상태</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {contracts.map((c) => {
              const isActive = c.startDate <= today && today <= c.endDate;
              return (
                <tr key={c.id}>
                  <td className="px-4 py-2">{RESTAURANT_LABELS[c.restaurant]}</td>
                  <td className="px-4 py-2 font-medium text-gray-900">{c.vendor.name}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {c.startDate.toISOString().slice(0, 10)} ~ {c.endDate.toISOString().slice(0, 10)}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{c._count.items}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {isActive ? "진행중" : "종료"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link href={`/contracts/${c.id}`} className="text-blue-600 hover:underline">
                      상세
                    </Link>
                  </td>
                </tr>
              );
            })}
            {contracts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  등록된 계약이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
