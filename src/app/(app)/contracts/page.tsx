import Link from "next/link";
import { db } from "@/lib/db";
import { CATEGORY_LABELS } from "@/lib/categories";

export default async function ContractsPage() {
  const today = new Date();

  // 모든 업체(Vendor)를 가져오고 각 업체의 계약(Contract) 목록을 포함시킵니다.
  const vendors = await db.vendor.findMany({
    include: {
      contracts: {
        orderBy: { startDate: "desc" },
        include: { _count: { select: { items: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  const activeOrNoContracts: {
    vendorName: string;
    vendorId: string;
    category: string;
    period: string;
    itemCount: number;
    status: "진행중" | "계약없음";
    contractId?: string;
  }[] = [];

  const expiredContracts: {
    vendorName: string;
    vendorId: string;
    category: string;
    period: string;
    itemCount: number;
    status: "종료";
    contractId: string;
  }[] = [];

  for (const v of vendors) {
    if (v.contracts.length === 0) {
      activeOrNoContracts.push({
        vendorName: v.name,
        vendorId: v.id,
        category: "-",
        period: "-",
        itemCount: 0,
        status: "계약없음",
      });
    } else {
      // 가장 최근 계약을 기준으로 진행중 여부 파악
      const latestContract = v.contracts[0];
      const isActive = latestContract.startDate <= today && today <= latestContract.endDate;

      if (isActive) {
        activeOrNoContracts.push({
          vendorName: v.name,
          vendorId: v.id,
          category: latestContract.category,
          period: `${latestContract.startDate.toISOString().slice(0, 10)} ~ ${latestContract.endDate.toISOString().slice(0, 10)}`,
          itemCount: latestContract._count.items,
          status: "진행중",
          contractId: latestContract.id,
        });

        // 진행중인 계약 이외의 하위 계약들은 만료된 계약 리스트로 분류
        for (let i = 1; i < v.contracts.length; i++) {
          const c = v.contracts[i];
          expiredContracts.push({
            vendorName: v.name,
            vendorId: v.id,
            category: c.category,
            period: `${c.startDate.toISOString().slice(0, 10)} ~ ${c.endDate.toISOString().slice(0, 10)}`,
            itemCount: c._count.items,
            status: "종료",
            contractId: c.id,
          });
        }
      } else {
        // 진행중인 계약이 없고 만료된 과거 계약만 있는 경우
        for (const c of v.contracts) {
          expiredContracts.push({
            vendorName: v.name,
            vendorId: v.id,
            category: c.category,
            period: `${c.startDate.toISOString().slice(0, 10)} ~ ${c.endDate.toISOString().slice(0, 10)}`,
            itemCount: c._count.items,
            status: "종료",
            contractId: c.id,
          });
        }
        // 이 업체는 현재 시점 진행중인 계약이 없으므로 "계약없음" 상태로 상단에 표시
        activeOrNoContracts.push({
          vendorName: v.name,
          vendorId: v.id,
          category: "-",
          period: "-",
          itemCount: 0,
          status: "계약없음",
        });
      }
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">계약/단가표 관리</h1>
          <p className="mt-1 text-sm text-gray-600">
            업체별 계약기간과 품목 단가표를 관리합니다. (계약/단가는 본관/후문 공통)
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/required-quantity"
            className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            소요수량 산출
          </Link>
          <Link
            href="/contracts/new"
            className="rounded bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            새 계약 등록
          </Link>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-bold text-gray-800">진행 중인 계약 및 계약 미등록 업체</h2>
        <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500">
              <tr>
                <th className="px-4 py-2">업체</th>
                <th className="px-4 py-2">카테고리</th>
                <th className="px-4 py-2">계약기간</th>
                <th className="px-4 py-2">품목 수</th>
                <th className="px-4 py-2">상태</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activeOrNoContracts.map((c, index) => (
                <tr key={index}>
                  <td className="px-4 py-2 font-medium text-gray-900">{c.vendorName}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {c.category !== "-" ? CATEGORY_LABELS[c.category as keyof typeof CATEGORY_LABELS] : "-"}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{c.period}</td>
                  <td className="px-4 py-2 text-gray-600">{c.itemCount}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.status === "진행중" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-3">
                      {c.status === "진행중" ? (
                        <>
                          <Link
                            href={`/slips/new?vendorId=${c.vendorId}`}
                            className="text-primary-600 hover:underline"
                          >
                            거래명세표 입력
                          </Link>
                          <Link href={`/contracts/${c.contractId}`} className="text-primary-600 hover:underline">
                            상세
                          </Link>
                        </>
                      ) : (
                        <Link
                          href="/contracts/new"
                          className="text-red-600 font-semibold hover:underline"
                        >
                          새 계약 등록
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {activeOrNoContracts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                    등록된 업체가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-bold text-gray-800">지난 계약 목록 (만료 건)</h2>
        <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500">
              <tr>
                <th className="px-4 py-2">업체</th>
                <th className="px-4 py-2">카테고리</th>
                <th className="px-4 py-2">계약기간</th>
                <th className="px-4 py-2">품목 수</th>
                <th className="px-4 py-2">상태</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expiredContracts.map((c, index) => (
                <tr key={index} className="bg-gray-50/50">
                  <td className="px-4 py-2 font-medium text-gray-900">{c.vendorName}</td>
                  <td className="px-4 py-2 text-gray-600">{CATEGORY_LABELS[c.category as keyof typeof CATEGORY_LABELS]}</td>
                  <td className="px-4 py-2 text-gray-600">{c.period}</td>
                  <td className="px-4 py-2 text-gray-600">{c.itemCount}</td>
                  <td className="px-4 py-2">
                    <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500">
                      종료
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-3">
                      <Link href={`/contracts/${c.contractId}`} className="text-primary-600 hover:underline">
                        상세
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {expiredContracts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                    만료된 지난 계약이 없습니다.
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
