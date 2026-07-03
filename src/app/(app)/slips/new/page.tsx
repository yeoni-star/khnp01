import { db } from "@/lib/db";
import { CATEGORY_LABELS } from "@/lib/categories";
import NewSlipForm from "@/components/slips/NewSlipForm";

export default async function NewSlipPage({
  searchParams,
}: {
  searchParams: Promise<{ vendorId?: string }>;
}) {
  const { vendorId } = await searchParams;

  const [contracts, defaultVendor] = await Promise.all([
    db.contract.findMany({ 
      include: { vendor: true },
      orderBy: { startDate: "desc" } 
    }),
    vendorId
      ? db.vendor.findUnique({
          where: { id: vendorId },
          include: { contracts: { orderBy: { startDate: "desc" }, take: 1, select: { category: true } } },
        })
      : null,
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-gray-900">거래명세표 입력</h1>

      <NewSlipForm
        contracts={contracts}
        defaultVendor={
          defaultVendor
            ? {
                id: defaultVendor.id,
                name: defaultVendor.name,
                categoryLabel: defaultVendor.contracts[0] ? CATEGORY_LABELS[defaultVendor.contracts[0].category] : null,
              }
            : null
        }
      />
    </div>
  );
}
