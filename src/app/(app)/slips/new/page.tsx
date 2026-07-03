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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
          <p className="font-medium text-gray-900">엑셀 업로드</p>
          <p className="mt-1 text-xs">다음 화면에서 양식에 맞춘 엑셀을 업로드하면 품목이 자동으로 채워집니다.</p>
          <div className="mt-2 flex gap-3 text-xs">
            <a href="/api/templates/slip-excel?taxType=TAXABLE" className="text-primary-600 hover:underline">
              과세 양식 다운로드
            </a>
            <a href="/api/templates/slip-excel?taxType=EXEMPT" className="text-primary-600 hover:underline">
              면세 양식 다운로드
            </a>
          </div>
        </div>
        <div className="rounded-md border border-gray-200 bg-white p-4 text-sm text-gray-700">
          <p className="font-medium text-gray-900">직접 입력</p>
          <p className="mt-1 text-xs text-gray-500">계약과 납품일자를 선택하고 품목을 직접 입력합니다.</p>
        </div>
      </div>

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
