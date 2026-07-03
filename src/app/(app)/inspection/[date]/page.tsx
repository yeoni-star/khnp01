import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getOrCreateInspectionLog } from "@/actions/inspection-actions";
import { DEFAULT_INSPECTION_COLUMNS, type InspectionColumn } from "@/lib/inspection";
import InspectionLogTable from "@/components/inspection/InspectionLogTable";

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

  const columns = (template?.columns as InspectionColumn[] | undefined) ?? DEFAULT_INSPECTION_COLUMNS;

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-gray-900">식재료 검수일지 - {date}</h1>

      <InspectionLogTable
        logId={log.id}
        dateStr={date}
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
