import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { RESTAURANT_LABELS } from "@/lib/restaurants";
import DeleteVendorButton from "@/components/vendors/DeleteVendorButton";
import VendorEditForm from "@/components/vendors/VendorEditForm";

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ vendorId: string }>;
}) {
  const { vendorId } = await params;
  const vendor = await db.vendor.findUnique({
    where: { id: vendorId },
    include: {
      contracts: {
        orderBy: { startDate: "desc" },
        include: { _count: { select: { items: true } } },
      },
      _count: { select: { deliverySlips: true } },
    },
  });
  if (!vendor) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{vendor.name}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {vendor.businessNo ?? "사업자번호 미등록"} · {vendor.contact ?? "연락처 미등록"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/contracts/new?vendorId=${vendor.id}`}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            계약 추가
          </Link>
          <DeleteVendorButton
            vendorId={vendor.id}
            disabled={vendor.contracts.length > 0 || vendor._count.deliverySlips > 0}
          />
        </div>
      </div>

      <VendorEditForm vendor={vendor} />

      <div>
        <h2 className="mb-2 text-sm font-semibold text-gray-900">계약 목록</h2>
        <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500">
              <tr>
                <th className="px-4 py-2">식당</th>
                <th className="px-4 py-2">계약기간</th>
                <th className="px-4 py-2">품목 수</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vendor.contracts.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-2">{RESTAURANT_LABELS[c.restaurant]}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {c.startDate.toISOString().slice(0, 10)} ~ {c.endDate.toISOString().slice(0, 10)}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{c._count.items}</td>
                  <td className="px-4 py-2 text-right">
                    <Link href={`/contracts/${c.id}`} className="text-blue-600 hover:underline">
                      상세
                    </Link>
                  </td>
                </tr>
              ))}
              {vendor.contracts.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                    등록된 계약이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
