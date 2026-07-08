import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { CATEGORY_LABELS, isCategoryCode, type CategoryCode } from "@/lib/categories";
import DateFilter from "./DateFilter";
import ExportCsvButton from "./ExportCsvButton";
import ClickableRow from "./ClickableRow";
import ContractItemSearchPanel from "./ContractItemSearchPanel";

export default async function UnmatchedItemsPage(props: {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
    restaurant?: string;
    category?: string;
    vendorId?: string;
    includeExpired?: string;
  }>;
}) {
  const session = await getSession();
  const searchParams = await props.searchParams;

  const restaurantFilter =
    searchParams.restaurant === "A" || searchParams.restaurant === "B"
      ? searchParams.restaurant
      : undefined;

  const restaurantLabel =
    searchParams.restaurant === "A" ? "본관" : searchParams.restaurant === "B" ? "후문" : "전체";

  const categoryFilter: CategoryCode | undefined = isCategoryCode(searchParams.category ?? "")
    ? (searchParams.category as CategoryCode)
    : undefined;
  const vendorIdFilter = searchParams.vendorId || undefined;
  const includeExpired = searchParams.includeExpired === "1";

  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (searchParams.startDate) {
    dateFilter.gte = new Date(searchParams.startDate);
  }
  if (searchParams.endDate) {
    dateFilter.lte = new Date(searchParams.endDate);
  }

  const allItems = await db.deliverySlipItem.findMany({
    where: {
      matchType: "NONE",
      slip: {
        ...(restaurantFilter ? { restaurant: restaurantFilter } : {}),
        ...(Object.keys(dateFilter).length > 0 ? { deliveryDate: dateFilter } : {}),
      },
    },
    include: { slip: { include: { vendor: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Fetch all contracts to map vendor + date to category, and to determine which vendors are currently active
  const vendorIds = Array.from(new Set(allItems.map((i) => i.slip.vendorId)));
  const contracts = await db.contract.findMany({
    where: { vendorId: { in: vendorIds } },
  });

  // 기본적으로는 계약이 만료되지 않은(현재 진행중인) 업체의 미등록 품목만 보여준다.
  const now = new Date();
  const activeVendorIds = new Set(
    contracts.filter((c) => c.startDate <= now && c.endDate >= now).map((c) => c.vendorId)
  );
  const items = includeExpired ? allItems : allItems.filter((i) => activeVendorIds.has(i.slip.vendorId));

  // 업체 드롭다운 옵션: 식당/기간/만료포함 필터가 적용된 시점의 업체 목록
  const vendorOptions = Array.from(new Map(items.map((i) => [i.slip.vendorId, i.slip.vendor.name])).entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));

  const enriched = items
    .map((item) => {
      // Find active contract for this vendor on the delivery date
      const dDate = item.slip.deliveryDate;
      const activeContract = contracts.find(
        (c) => c.vendorId === item.slip.vendorId && c.startDate <= dDate && c.endDate >= dDate
      );
      const categoryCode = activeContract?.category ?? item.category;
      return { item, categoryCode };
    })
    .filter(({ item, categoryCode }) => {
      if (categoryFilter && categoryCode !== categoryFilter) return false;
      if (vendorIdFilter && item.slip.vendorId !== vendorIdFilter) return false;
      return true;
    });

  const rows = enriched.map(({ item, categoryCode }, index) => {
    const itemRestaurantLabel = item.slip.restaurant === "A" ? "본관" : "후문";
    return {
      순번: index + 1,
      식당: itemRestaurantLabel,
      납품일자: item.slip.deliveryDate.toISOString().slice(0, 10),
      품명: item.itemName,
      카테고리: categoryCode ? CATEGORY_LABELS[categoryCode] : "-",
      단가: item.unitPrice,
      업체명: item.slip.vendor.name,
    };
  });
  const slipIds = enriched.map(({ item }) => item.slip.id);

  const contractItems = await db.contractItem.findMany({
    include: { contract: { include: { vendor: true } } },
    orderBy: { itemName: "asc" },
  });
  const searchPanelItems = contractItems.map((ci) => ({
    id: ci.id,
    itemName: ci.itemName,
    category: ci.category,
    unit: ci.unit,
    unitPrice: ci.unitPrice,
    vendorName: ci.contract.vendor.name,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">미등록 품목</h1>
        <p className="mt-1 text-sm text-gray-600">
          계약 단가표에 없어 유사매칭도 확인되지 않은 품목입니다. 계약에 정식 등록할지 검토해 주세요.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <DateFilter vendors={vendorOptions} />
        <ExportCsvButton data={rows} filename={`미등록품목_${restaurantLabel}_${new Date().toISOString().slice(0, 10)}.csv`} />
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 overflow-hidden rounded-md border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500">
              <tr>
                <th className="px-4 py-2 text-center w-16">순번</th>
                <th className="px-4 py-2">식당</th>
                <th className="px-4 py-2">납품일자</th>
                <th className="px-4 py-2">품명</th>
                <th className="px-4 py-2">카테고리</th>
                <th className="px-4 py-2">단가</th>
                <th className="px-4 py-2">업체</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, index) => (
                <ClickableRow key={index} href={`/slips/${slipIds[index]}`}>
                  <td className="px-4 py-2 text-center text-gray-500">{row.순번}</td>
                  <td className="px-4 py-2 text-gray-900">{row.식당}</td>
                  <td className="px-4 py-2 text-gray-900">{row.납품일자}</td>
                  <td className="px-4 py-2 font-medium text-gray-900">{row.품명}</td>
                  <td className="px-4 py-2 text-gray-600">{row.카테고리}</td>
                  <td className="px-4 py-2 text-gray-900">{row.단가.toLocaleString()}원</td>
                  <td className="px-4 py-2 text-gray-600">{row.업체명}</td>
                </ClickableRow>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                    해당 조건에 미등록 품목이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="col-span-2">
          <ContractItemSearchPanel items={searchPanelItems} />
        </div>
      </div>
    </div>
  );
}
