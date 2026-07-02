import { db } from "./db";

export function normalizeItemName(itemName: string): string {
  return itemName.trim().toLowerCase();
}

export function contractsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export async function hasOverlappingContract(
  vendorId: string,
  startDate: Date,
  endDate: Date,
  excludeContractId?: string
): Promise<boolean> {
  const existing = await db.contract.findMany({
    where: {
      vendorId,
      ...(excludeContractId ? { id: { not: excludeContractId } } : {}),
    },
    select: { startDate: true, endDate: true },
  });
  return existing.some((c) => contractsOverlap(startDate, endDate, c.startDate, c.endDate));
}

/**
 * 업체의 특정 날짜 기준 활성 계약(두 식당 공통)에서, 품목명이 정확히 일치하는 단가표 항목을 찾는다.
 * 계약기간이 겹치는 경우는 생성 시점에 차단되므로, 활성 계약은 최대 1건이어야 정상이다.
 */
export async function findActiveContractItem(vendorId: string, itemName: string, onDate: Date) {
  const normalized = normalizeItemName(itemName);
  if (!normalized) return null;

  const contract = await db.contract.findFirst({
    where: {
      vendorId,
      startDate: { lte: onDate },
      endDate: { gte: onDate },
    },
    orderBy: { startDate: "desc" },
    include: { items: true },
  });

  if (!contract) return null;

  return (
    contract.items.find((item) => normalizeItemName(item.itemName) === normalized) ?? null
  );
}

/** 자유입력 및 유사매칭 제안용: 업체의 활성 계약(두 식당 공통)에 등록된 전체 품목 목록 */
export async function listActiveContractItems(vendorId: string, onDate: Date) {
  const contract = await db.contract.findFirst({
    where: {
      vendorId,
      startDate: { lte: onDate },
      endDate: { gte: onDate },
    },
    orderBy: { startDate: "desc" },
    include: { items: true },
  });
  return contract?.items ?? [];
}
