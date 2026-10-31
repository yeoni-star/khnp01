import { describe, expect, it } from "vitest";
import { buildContractOverview, type OverviewContract } from "./contract-overview";

const TODAY = "2026-10-31";

function contract(id: string, category: OverviewContract["category"], start: string, end: string): OverviewContract {
  return { id, category, startDate: new Date(`${start}T00:00:00.000Z`), endDate: new Date(`${end}T00:00:00.000Z`), itemCount: 3 };
}

describe("buildContractOverview", () => {
  it("11/2 시작 계약은 종료가 아니라 예정으로 분류하고 지난 계약 목록에 넣지 않는다", () => {
    const { current, expired } = buildContractOverview(
      [
        {
          id: "v1",
          name: "가림",
          contracts: [contract("c2", "MEAT", "2026-11-02", "2027-04-30"), contract("c1", "MEAT", "2026-05-01", "2026-10-31")],
        },
      ],
      TODAY
    );
    expect(current.map((r) => [r.contractId, r.status])).toEqual([
      ["c1", "진행중"],
      ["c2", "예정"],
    ]);
    expect(expired).toEqual([]);
  });

  it("종료일 당일까지는 진행중이다(거래명세표 단가 매칭과 같은 기준)", () => {
    const { current } = buildContractOverview(
      [{ id: "v1", name: "신우", contracts: [contract("c1", "PRODUCE", "2026-05-01", "2026-10-31")] }],
      TODAY
    );
    expect(current[0].status).toBe("진행중");
  });

  it("종료일이 지나면 종료로 분류한다", () => {
    const { current, expired } = buildContractOverview(
      [{ id: "v1", name: "신우", contracts: [contract("c1", "PRODUCE", "2026-05-01", "2026-10-30")] }],
      TODAY
    );
    expect(expired.map((r) => r.contractId)).toEqual(["c1"]);
    expect(current[0]).toMatchObject({ status: "계약없음", category: "PRODUCE", needsNextContract: true });
  });

  it("차기 계약이 이미 입력된 카테고리는 빨간 표시 대상이 아니다", () => {
    const { current } = buildContractOverview(
      [
        {
          id: "v1",
          name: "가림",
          contracts: [contract("c2", "MEAT", "2026-11-02", "2027-04-30"), contract("c1", "MEAT", "2026-05-01", "2026-10-31")],
        },
      ],
      TODAY
    );
    const active = current.find((r) => r.status === "진행중");
    expect(active).toMatchObject({ needsNextContract: false });
  });

  it("차기 계약이 없고 종료가 임박한 진행중 계약은 빨간 표시 대상이다", () => {
    const { current } = buildContractOverview(
      [{ id: "v1", name: "드림", contracts: [contract("c1", "PROCESSED", "2026-05-01", "2026-10-31")] }],
      TODAY
    );
    expect(current[0]).toMatchObject({ status: "진행중", needsNextContract: true });
  });

  it("종료까지 한참 남은 진행중 계약은 차기 계약이 없어도 빨간 표시를 하지 않는다", () => {
    const { current } = buildContractOverview(
      [{ id: "v1", name: "드림", contracts: [contract("c1", "PROCESSED", "2026-05-01", "2027-04-30")] }],
      TODAY
    );
    expect(current[0].needsNextContract).toBe(false);
  });

  it("다른 카테고리의 예정 계약은 차기 계약으로 보지 않는다", () => {
    const { current } = buildContractOverview(
      [
        {
          id: "v1",
          name: "동부산",
          contracts: [contract("c2", "KIMCHI", "2026-11-02", "2027-04-30"), contract("c1", "GRAIN", "2026-05-28", "2026-11-27")],
        },
      ],
      TODAY
    );
    const grain = current.find((r) => r.category === "GRAIN");
    expect(grain).toMatchObject({ status: "진행중", needsNextContract: true });
  });

  it("다른 업체가 맺은 같은 카테고리 차기 계약도 차기 계약으로 본다(업체가 바뀌는 경우)", () => {
    const { current } = buildContractOverview(
      [
        { id: "v1", name: "신우", contracts: [contract("c1", "PRODUCE", "2026-05-01", "2026-10-31")] },
        { id: "v2", name: "새농산", contracts: [contract("c2", "PRODUCE", "2026-11-02", "2027-04-30")] },
      ],
      TODAY
    );
    const active = current.find((r) => r.status === "진행중");
    expect(active).toMatchObject({ needsNextContract: false });
  });

  it("계약이 끝난 업체의 카테고리를 다른 업체가 이어받았다면 새 계약 등록이 필요 없다", () => {
    const { current } = buildContractOverview(
      [
        { id: "v1", name: "신우", contracts: [contract("c1", "PRODUCE", "2026-05-01", "2026-10-30")] },
        { id: "v2", name: "새농산", contracts: [contract("c2", "PRODUCE", "2026-11-02", "2027-04-30")] },
      ],
      TODAY
    );
    const lapsed = current.find((r) => r.vendorId === "v1");
    expect(lapsed).toMatchObject({ status: "계약없음", category: "PRODUCE", needsNextContract: false });
  });

  it("끝난 카테고리를 아무도 이어받지 않았으면 새 계약 등록이 필요하다", () => {
    const { current } = buildContractOverview(
      [
        { id: "v1", name: "신우", contracts: [contract("c1", "PRODUCE", "2026-05-01", "2026-10-30")] },
        { id: "v2", name: "드림", contracts: [contract("c2", "PROCESSED", "2026-11-02", "2027-04-30")] },
      ],
      TODAY
    );
    expect(current.find((r) => r.vendorId === "v1")).toMatchObject({ needsNextContract: true });
  });

  it("같은 카테고리끼리 모아서 정렬한다(진행중 → 예정 → 계약없음 순)", () => {
    const { current, expired } = buildContractOverview(
      [
        { id: "v1", name: "가", contracts: [contract("a1", "MEAT", "2026-05-01", "2027-04-30")] },
        { id: "v2", name: "나", contracts: [contract("b1", "GRAIN", "2026-05-01", "2027-04-30")] },
        { id: "v3", name: "다", contracts: [contract("c1", "MEAT", "2026-11-02", "2027-04-30")] },
        { id: "v4", name: "라", contracts: [contract("d1", "KIMCHI", "2026-01-01", "2026-03-31")] },
        { id: "v5", name: "마", contracts: [contract("e1", "GRAIN", "2025-01-01", "2025-06-30")] },
        { id: "v6", name: "바", contracts: [] },
      ],
      TODAY
    );
    expect(current.map((r) => `${r.vendorName}:${r.category}:${r.status}`)).toEqual([
      "나:GRAIN:진행중",
      "마:GRAIN:계약없음",
      "라:KIMCHI:계약없음",
      "가:MEAT:진행중",
      "다:MEAT:예정",
      "바:null:계약없음",
    ]);
    expect(expired.map((r) => r.category)).toEqual(["GRAIN", "KIMCHI"]);
  });

  it("예정 계약만 있는 업체는 예정으로 표시하고 계약없음으로 보지 않는다", () => {
    const { current } = buildContractOverview(
      [{ id: "v1", name: "해도지", contracts: [contract("c2", "KIMCHI", "2026-11-02", "2027-04-30")] }],
      TODAY
    );
    expect(current).toHaveLength(1);
    expect(current[0]).toMatchObject({ status: "예정", needsNextContract: false });
  });

  it("계약이 하나도 없는 업체는 계약없음(빨간 표시)이다", () => {
    const { current } = buildContractOverview([{ id: "v1", name: "신규", contracts: [] }], TODAY);
    expect(current[0]).toMatchObject({ status: "계약없음", category: null, needsNextContract: true });
  });
});
