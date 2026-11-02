import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { listActiveContractItems, getActiveContractCategory } from "@/lib/pricing";
import { RESTAURANT_LABELS } from "@/lib/restaurants";
import { TAX_TYPE_LABELS } from "@/lib/tax";
import SlipItemsTable from "@/components/slips/SlipItemsTable";
import DeleteSlipButton from "@/components/slips/DeleteSlipButton";
import RevertSlipButton from "@/components/slips/RevertSlipButton";
import { dedupeUnmatchedItems } from "@/lib/unmatched-options";

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

  const [activeContractItems, defaultCategory] = await Promise.all([
    listActiveContractItems(slip.vendorId, slip.deliveryDate),
    getActiveContractCategory(slip.vendorId, slip.deliveryDate),
  ]);

  // 미등록(수기 입력) 품목 자동완성: 납품일에 유효한 계약이 있는 모든 업체의 미등록 품목 + 이 명세표 업체의 미등록 품목.
  const validContracts = await db.contract.findMany({
    where: { startDate: { lte: slip.deliveryDate }, endDate: { gte: slip.deliveryDate } },
    select: { vendorId: true },
  });
  const vendorIds = Array.from(new Set([slip.vendorId, ...validContracts.map((c) => c.vendorId)]));

  const unmatchedRows = await db.deliverySlipItem.findMany({
    where: { matchType: "NONE", slip: { vendorId: { in: vendorIds } } },
    select: { itemName: true, unit: true, unitPrice: true, slip: { select: { vendor: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  const unmatchedItems = dedupeUnmatchedItems(
    unmatchedRows.map((r) => ({
      itemName: r.itemName,
      unit: r.unit,
      unitPrice: r.unitPrice,
      vendorName: r.slip.vendor.name,
    }))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            {slip.vendor.name} · {slip.deliveryDate.toISOString().slice(0, 10)}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {RESTAURANT_LABELS[slip.restaurant]} · {TAX_TYPE_LABELS[slip.taxType]} ·{" "}
            {slip.status === "CONFIRMED" ? "확정됨" : "임시저장"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {slip.status === "CONFIRMED" && <RevertSlipButton slipId={slip.id} />}
          <DeleteSlipButton slipId={slip.id} />
        </div>
      </div>

      <SlipItemsTable
        slipId={slip.id}
        status={slip.status}
        taxType={slip.taxType}
        defaultCategory={defaultCategory}
        contractItems={activeContractItems.map((i) => ({
          id: i.id,
          itemName: i.itemName,
          category: i.category,
          unit: i.unit,
          unitPrice: i.unitPrice,
        }))}
        unmatchedItems={unmatchedItems}
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
