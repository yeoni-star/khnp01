import { getSession } from "@/lib/session";
import { buildSummaryReport } from "@/lib/report-aggregate";
import { formatReportPeriod } from "@/lib/vendor-report";
import { parseDateRange, parseCategories } from "@/lib/report-period";
import { RESTAURANT_LABELS } from "@/lib/restaurants";
import SummaryReportTable from "@/components/reports/SummaryReportTable";

export default async function SummaryReportPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string; categories?: string | string[]; vendorIds?: string | string[] }>;
}) {
  const sp = await searchParams;
  const { startDate, endDate, startStr, endStr } = parseDateRange(sp.start, sp.end);
  const categories = parseCategories(sp.categories);
  const categoriesParam = categories?.join(",");
  const session = await getSession();

  // vendorIds는 ?vendorIds=id1&vendorIds=id2 또는 ?vendorIds=id1 형태 모두 지원
  const rawVendorIds = sp.vendorIds;
  const vendorIds: string[] | undefined = rawVendorIds
    ? Array.isArray(rawVendorIds)
      ? rawVendorIds
      : [rawVendorIds]
    : undefined;

  const report = await buildSummaryReport(session!.restaurant, startDate, endDate, {
    vendorIds: vendorIds && vendorIds.length > 0 ? vendorIds : undefined,
    categories,
  });

  const selectedCount = vendorIds?.length ?? 0;

  return (
    <SummaryReportTable
      restaurantLabel={RESTAURANT_LABELS[session!.restaurant]}
      periodLabel={formatReportPeriod(startDate, endDate)}
      startStr={startStr}
      endStr={endStr}
      categoriesParam={categoriesParam}
      report={report}
      selectedVendorCount={selectedCount}
    />
  );
}
