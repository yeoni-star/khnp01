import Link from "next/link";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import InspectionNoticeModal from "@/components/inspection/InspectionNoticeModal";
import InspectionDateEntry from "@/components/inspection/InspectionDateEntry";

export default async function InspectionPage() {
  const session = await getSession();
  const restaurant = session!.restaurant;

  const logs = await db.inspectionLog.findMany({
    where: { restaurant },
    orderBy: { logDate: "desc" },
    take: 30,
    include: { _count: { select: { rows: true } } },
  });

  return (
    <div className="space-y-6">
      <InspectionNoticeModal />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">식재료 검수일지</h1>
          <p className="mt-1 text-sm text-gray-600">입고일자를 선택해 검수일지를 작성하거나 확인합니다.</p>
        </div>
        <Link
          href="/inspection/template"
          className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          양식 설정
        </Link>
      </div>

      <InspectionDateEntry />

      <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500">
            <tr>
              <th className="px-4 py-2">입고일자</th>
              <th className="px-4 py-2">검수자</th>
              <th className="px-4 py-2">품목 수</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="px-4 py-2 text-gray-600">{log.logDate.toISOString().slice(0, 10)}</td>
                <td className="px-4 py-2 text-gray-600">{log.inspectorName ?? "-"}</td>
                <td className="px-4 py-2 text-gray-600">{log._count.rows}</td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/inspection/${log.logDate.toISOString().slice(0, 10)}`}
                    className="text-primary-600 hover:underline"
                  >
                    열기
                  </Link>
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  작성된 검수일지가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
