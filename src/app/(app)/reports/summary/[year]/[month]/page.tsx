import { getSession } from "@/lib/session";
import { buildSummaryReport } from "@/lib/report-aggregate";
import { RESTAURANT_LABELS } from "@/lib/restaurants";
import SummaryReportTable from "@/components/reports/SummaryReportTable";

export default async function SummaryReportPage({
  params,
}: {
  params: Promise<{ year: string; month: string }>;
}) {
  const { year, month } = await params;
  const session = await getSession();
  const report = await buildSummaryReport(session!.restaurant, Number(year), Number(month));

  return (
    <SummaryReportTable
      restaurantLabel={RESTAURANT_LABELS[session!.restaurant]}
      year={Number(year)}
      month={Number(month)}
      report={report}
    />
  );
}
