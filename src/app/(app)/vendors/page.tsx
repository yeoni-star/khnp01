import Link from "next/link";
import { db } from "@/lib/db";
import VendorForm from "@/components/vendors/VendorForm";

export default async function VendorsPage() {
  const vendors = await db.vendor.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { contracts: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">업체 관리</h1>
        <p className="mt-1 text-sm text-gray-600">식재료 납품 업체를 등록하고 관리합니다.</p>
      </div>

      <VendorForm />

      <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500">
            <tr>
              <th className="px-4 py-2">업체명</th>
              <th className="px-4 py-2">사업자번호</th>
              <th className="px-4 py-2">연락처</th>
              <th className="px-4 py-2">계약 수</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {vendors.map((v) => (
              <tr key={v.id}>
                <td className="px-4 py-2 font-medium text-gray-900">{v.name}</td>
                <td className="px-4 py-2 text-gray-600">{v.businessNo ?? "-"}</td>
                <td className="px-4 py-2 text-gray-600">{v.contact ?? "-"}</td>
                <td className="px-4 py-2 text-gray-600">{v._count.contracts}</td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/vendors/${v.id}`} className="text-blue-600 hover:underline">
                    상세
                  </Link>
                </td>
              </tr>
            ))}
            {vendors.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  등록된 업체가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
