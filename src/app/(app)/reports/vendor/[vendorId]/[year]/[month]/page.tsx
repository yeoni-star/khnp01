import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { buildVendorReport } from "@/lib/vendor-report";
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

  const report = await buildVendorReport(session!.restaurant, vendorId, Number(year), Number(month));

  return (
    <VendorReportTable
      vendorId={vendorId}
      vendorName={vendor.name}
      year={Number(year)}
      month={Number(month)}
      report={report}
    />
  );
}
