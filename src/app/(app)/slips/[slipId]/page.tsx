import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { listActiveContractItems } from "@/lib/pricing";
import { RESTAURANT_LABELS } from "@/lib/restaurants";
import { TAX_TYPE_LABELS } from "@/lib/tax";
import SlipItemsTable from "@/components/slips/SlipItemsTable";
import DeleteSlipButton from "@/components/slips/DeleteSlipButton";

export default async function SlipDetailPage({
  params,
}: {
  params: Promise<{ slipId: string }>;
}) {
  const { slipId } = await params;
  const slip = await db.deliverySlip.findUnique({
    where: { id: slipId },
    include: { vendor: true, items: true },
  });
  if (!slip) notFound();

  const activeContractItems = await listActiveContractItems(slip.vendorId, slip.deliveryDate);

  const unmatchedItems = await db.deliverySlipItem.findMany({
    where: { matchType: "NONE" },
    select: { itemName: true, unit: true, unitPrice: true },
    distinct: ["itemName", "unit", "unitPrice"],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            {slip.vendor.name} · {slip.deliveryDate.toISOString().slice(0, 10)}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {RESTAURANT_LABELS[slip.restaurant]} · {TAX_TYPE_LABELS[slip.taxType]} ·{" "}
            {slip.status === "CONFIRMED" ? "확정됨" : "임시저장"}
          </p>
        </div>
        <DeleteSlipButton slipId={slip.id} />
      </div>

      <SlipItemsTable
        slipId={slip.id}
        status={slip.status}
        taxType={slip.taxType}
        contractItems={activeContractItems.map((i) => ({
          id: i.id,
          itemName: i.itemName,
          category: i.category,
          unit: i.unit,
          unitPrice: i.unitPrice,
        }))}
        unmatchedItems={unmatchedItems.map((i) => ({
          itemName: i.itemName,
          unit: i.unit,
          unitPrice: i.unitPrice,
        }))}
        initialItems={slip.items.map((i) => ({
          itemName: i.itemName,
          category: i.category,
          unit: i.unit,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          taxAmount: i.taxAmount,
          matchedContractItemId: i.matchedContractItemId,
          matchType: i.matchType,
          priceOverridden: i.priceOverridden,
        }))}
      />
    </div>
  );
}
