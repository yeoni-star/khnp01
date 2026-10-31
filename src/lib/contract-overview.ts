import { CATEGORIES, type CategoryCode } from "./categories";

export type OverviewContract = {
  id: string;
  category: CategoryCode;
  startDate: Date;
  endDate: Date;
  itemCount: number;
};

export type OverviewVendor = {
  id: string;
  name: string;
  contracts: OverviewContract[];
};

export type CurrentRow = {
  vendorId: string;
  vendorName: string;
  category: CategoryCode | null;
  period: string;
  itemCount: number;
  status: "진행중" | "예정" | "계약없음";
  contractId?: string;
};

export type ExpiredRow = {
  vendorId: string;
  vendorName: string;
  category: CategoryCode;
  period: string;
  itemCount: number;
  contractId: string;
};

export type ContractOverview = { current: CurrentRow[]; expired: ExpiredRow[] };

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function periodOf(c: OverviewContract): string {
  return `${dateStr(c.startDate)} ~ ${dateStr(c.endDate)}`;
}

/**
 * 계약을 날짜 단위로 진행중(시작일 ≤ 오늘 ≤ 종료일) / 예정(시작일 > 오늘) / 종료(종료일 < 오늘)로 나눈다.
 * 거래명세표 단가 매칭과 같은 기준이라 종료일 당일까지는 진행중이다.
 * 결과는 같은 카테고리끼리 모아서 정렬한다.
 */
export function buildContractOverview(vendors: OverviewVendor[], today: string): ContractOverview {
  const current: CurrentRow[] = [];
  const expired: ExpiredRow[] = [];

  for (const v of vendors) {
    const active = v.contracts.filter((c) => dateStr(c.startDate) <= today && today <= dateStr(c.endDate));
    const upcoming = v.contracts
      .filter((c) => dateStr(c.startDate) > today)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    const ended = v.contracts
      .filter((c) => dateStr(c.endDate) < today)
      .sort((a, b) => b.startDate.getTime() - a.startDate.getTime());

    for (const c of ended) {
      expired.push({
        vendorId: v.id,
        vendorName: v.name,
        category: c.category,
        period: periodOf(c),
        itemCount: c.itemCount,
        contractId: c.id,
      });
    }

    for (const [status, list] of [
      ["진행중", active],
      ["예정", upcoming],
    ] as const) {
      for (const c of list) {
        current.push({
          vendorId: v.id,
          vendorName: v.name,
          category: c.category,
          period: periodOf(c),
          itemCount: c.itemCount,
          status,
          contractId: c.id,
        });
      }
    }

    if (active.length === 0 && upcoming.length === 0) {
      current.push({
        vendorId: v.id,
        vendorName: v.name,
        category: ended[0]?.category ?? null,
        period: "-",
        itemCount: 0,
        status: "계약없음",
      });
    }
  }

  // 카테고리를 알 수 없는 업체(계약 이력 없음)는 맨 아래.
  const categoryRank = (category: CategoryCode | null) => (category === null ? CATEGORIES.length : CATEGORIES.indexOf(category));
  const statusRank = { 진행중: 0, 예정: 1, 계약없음: 2 } as const;
  const indexed = current.map((row, index) => ({ row, index }));
  indexed.sort(
    (a, b) =>
      categoryRank(a.row.category) - categoryRank(b.row.category) ||
      statusRank[a.row.status] - statusRank[b.row.status] ||
      a.index - b.index
  );
  const expiredIndexed = expired.map((row, index) => ({ row, index }));
  expiredIndexed.sort((a, b) => categoryRank(a.row.category) - categoryRank(b.row.category) || a.index - b.index);

  return { current: indexed.map((x) => x.row), expired: expiredIndexed.map((x) => x.row) };
}
