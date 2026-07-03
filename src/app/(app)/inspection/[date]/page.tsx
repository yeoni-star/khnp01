import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getOrCreateInspectionLog } from "@/actions/inspection-actions";
import type { InspectionColumn } from "@/lib/inspection";
import InspectionLogTable from "@/components/inspection/InspectionLogTable";
import DeleteInspectionLogButton from "@/components/inspection/DeleteInspectionLogButton";
import PrintButton from "@/components/reports/PrintButton";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default async function InspectionLogPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!DATE_PATTERN.test(date)) notFound();

  const session = await getSession();
  const restaurant = session!.restaurant;

  const logId = await getOrCreateInspectionLog(date);

  const [log, template] = await Promise.all([
    db.inspectionLog.findUnique({
      where: { id: logId },
      include: { rows: { orderBy: { order: "asc" } } },
    }),
    db.inspectionTemplate.findUnique({ where: { restaurant } }),
  ]);
  if (!log) notFound();

  const columns = (template?.columns as InspectionColumn[] | undefined) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-lg font-semibold text-gray-900">식재료 검수일지 - {date}</h1>
        <div className="flex gap-2">
          <PrintButton />
          <a
            href={`/api/inspection/export?date=${date}`}
            className="rounded bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            엑셀로 내보내기
          </a>
          <DeleteInspectionLogButton logId={log.id} />
        </div>
      </div>
      <h1 className="hidden text-lg font-semibold text-gray-900 print:block">식재료 검수일지 - {date}</h1>

      {columns.length === 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 print:hidden">
          아직 검수 항목이 설정되지 않았습니다.{" "}
          <Link href="/inspection/template" className="font-medium underline">
            양식 설정
          </Link>
          에서 검수할 컬럼을 먼저 추가해 주세요.
        </div>
      )}

      <InspectionLogTable
        logId={log.id}
        dateStr={date}
        status={log.status}
        columns={columns}
        initialInspectorName={log.inspectorName ?? ""}
        initialRows={log.rows.map((r) => ({
          sourceItemId: r.sourceItemId,
          itemName: r.itemName,
          unit: r.unit,
          quantity: r.quantity,
          vendorName: r.vendorName,
          values: r.values as Record<string, string>,
        }))}
      />
    </div>
  );
}
