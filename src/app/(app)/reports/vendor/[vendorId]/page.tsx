import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { buildVendorReport, formatReportPeriod } from "@/lib/vendor-report";
import { parseDateRange, parseCategories } from "@/lib/report-period";
import { CATEGORY_LABELS } from "@/lib/categories";
import VendorReportTable from "@/components/reports/VendorReportTable";

export default async function VendorReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ vendorId: string }>;
  searchParams: Promise<{ start?: string; end?: string; categories?: string | string[] }>;
}) {
  const { vendorId } = await params;
  const sp = await searchParams;
  const { startDate, endDate, startStr, endStr } = parseDateRange(sp.start, sp.end);
  const categories = parseCategories(sp.categories);
  const categoriesParam = categories?.join(",");

  const session = await getSession();
  const vendor = await db.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) notFound();

  const [report, contract] = await Promise.all([
    buildVendorReport(session!.restaurant, vendorId, startDate, endDate, categories),
    db.contract.findFirst({ where: { vendorId }, orderBy: { startDate: "desc" }, select: { category: true } }),
  ]);

  return (
    <VendorReportTable
      vendorId={vendorId}
      vendorName={vendor.name}
      categoryLabel={contract ? CATEGORY_LABELS[contract.category] : null}
      periodLabel={formatReportPeriod(startDate, endDate)}
      startStr={startStr}
      endStr={endStr}
      categoriesParam={categoriesParam}
      report={report}
    />
  );
}
