import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { buildVendorReport } from "@/lib/vendor-report";
import { CATEGORY_LABELS } from "@/lib/categories";
import VendorReportTable from "@/components/reports/VendorReportTable";

export default async function VendorReportPage({
  params,
}: {
  params: Promise<{ vendorId: string; year: string; month: string }>;
}) {
  const { vendorId, year, month } = await params;
  const session = await getSession();
  const vendor = await db.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) notFound();

  const [report, contract] = await Promise.all([
    buildVendorReport(session!.restaurant, vendorId, Number(year), Number(month)),
    db.contract.findFirst({ where: { vendorId }, orderBy: { startDate: "desc" }, select: { category: true } }),
  ]);

  return (
    <VendorReportTable
      vendorId={vendorId}
      vendorName={vendor.name}
      categoryLabel={contract ? CATEGORY_LABELS[contract.category] : null}
      year={Number(year)}
      month={Number(month)}
      report={report}
    />
  );
}
