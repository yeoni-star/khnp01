import { CATEGORIES, type CategoryCode } from "./categories";

/** 진행 중인 계약의 종료일이 이 일수 안으로 다가왔는데 차기 계약이 없으면 "새 계약 등록"을 강조한다. */
export const NEXT_CONTRACT_WARN_DAYS = 45;

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
  /** 차기 계약 입력이 필요한데 아직 없는 경우(빨간 "새 계약 등록" 표시 대상). */
  needsNextContract: boolean;
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

function daysBetween(fromStr: string, toStr: string): number {
  return Math.round((Date.parse(toStr) - Date.parse(fromStr)) / 86_400_000);
}

/**
 * 차기 계약 여부는 업체가 아니라 카테고리 기준이다(카테고리별로 계약 업체가 바뀔 수 있다).
 * 계약을 날짜 단위로 진행중(시작일 ≤ 오늘 ≤ 종료일) / 예정(시작일 > 오늘) / 종료(종료일 < 오늘)로 나눈다.
 * 거래명세표 단가 매칭과 같은 기준이라 종료일 당일까지는 진행중이다.
 */
export function buildContractOverview(vendors: OverviewVendor[], today: string): ContractOverview {
  const current: CurrentRow[] = [];
  const expired: ExpiredRow[] = [];

  // 카테고리별로 예정(차기) 계약과 진행중 계약이 있는지를 모든 업체에 걸쳐 미리 구해 둔다.
  const upcomingCategories = new Set<CategoryCode>();
  const activeCategories = new Set<CategoryCode>();
  for (const v of vendors) {
    for (const c of v.contracts) {
      const start = dateStr(c.startDate);
      if (start <= today && today <= dateStr(c.endDate)) activeCategories.add(c.category);
      if (start > today) upcomingCategories.add(c.category);
    }
  }

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

    for (const c of active) {
      const hasNext = upcomingCategories.has(c.category);
      const daysLeft = daysBetween(today, dateStr(c.endDate));
      current.push({
        vendorId: v.id,
        vendorName: v.name,
        category: c.category,
        period: periodOf(c),
        itemCount: c.itemCount,
        status: "진행중",
        contractId: c.id,
        needsNextContract: !hasNext && daysLeft <= NEXT_CONTRACT_WARN_DAYS,
      });
    }

    for (const c of upcoming) {
      current.push({
        vendorId: v.id,
        vendorName: v.name,
        category: c.category,
        period: periodOf(c),
        itemCount: c.itemCount,
        status: "예정",
        contractId: c.id,
        needsNextContract: false,
      });
    }

    if (active.length === 0 && upcoming.length === 0) {
      const category = ended[0]?.category ?? null;
      // 이 업체는 계약이 없지만, 그 카테고리를 다른 업체가 이어받았다면(진행중/예정) 새 계약 등록이 필요 없다.
      const categoryCovered = category !== null && (activeCategories.has(category) || upcomingCategories.has(category));
      current.push({
        vendorId: v.id,
        vendorName: v.name,
        category,
        period: "-",
        itemCount: 0,
        status: "계약없음",
        needsNextContract: !categoryCovered,
      });
    }
  }

  // 같은 카테고리끼리 모아서 보여준다. 카테고리를 알 수 없는 업체(계약 이력 없음)는 맨 아래.
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
