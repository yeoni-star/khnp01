import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "./db";
import { contractsOverlap, hasOverlappingContract, findActiveContractItem } from "./pricing";

describe("contractsOverlap", () => {
  it("겹치지 않는 기간은 false", () => {
    expect(
      contractsOverlap(
        new Date("2026-01-01"),
        new Date("2026-03-31"),
        new Date("2026-04-01"),
        new Date("2026-06-30")
      )
    ).toBe(false);
  });

  it("겹치는 기간은 true", () => {
    expect(
      contractsOverlap(
        new Date("2026-01-01"),
        new Date("2026-06-30"),
        new Date("2026-06-01"),
        new Date("2026-12-31")
      )
    ).toBe(true);
  });

  it("경계가 맞닿은 경우도 겹침으로 판단", () => {
    expect(
      contractsOverlap(
        new Date("2026-01-01"),
        new Date("2026-06-30"),
        new Date("2026-06-30"),
        new Date("2026-12-31")
      )
    ).toBe(true);
  });
});

describe("findActiveContractItem / hasOverlappingContract (integration)", () => {
  let vendorId: string;
  let contractId: string;

  beforeAll(async () => {
    const vendor = await db.vendor.create({ data: { name: "__test_vendor__" } });
    vendorId = vendor.id;
    const contract = await db.contract.create({
      data: {
        vendorId,
        category: "PROCESSED",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-06-30"),
        items: {
          create: [{ itemName: "식용유", category: "PROCESSED", unit: "말", unitPrice: 46200 }],
        },
      },
    });
    contractId = contract.id;
  });

  afterAll(async () => {
    await db.contract.delete({ where: { id: contractId } });
    await db.vendor.delete({ where: { id: vendorId } });
    await db.$disconnect();
  });

  it("계약기간 내 날짜 + 정확한 품목명이면 단가를 찾는다", async () => {
    const item = await findActiveContractItem(vendorId, "식용유", new Date("2026-03-15"));
    expect(item?.unitPrice).toBe(46200);
  });

  it("공백/대소문자가 달라도 정규화하여 매칭한다", async () => {
    const item = await findActiveContractItem(vendorId, "  식용유  ", new Date("2026-03-15"));
    expect(item?.unitPrice).toBe(46200);
  });

  it("계약기간 밖의 날짜면 null", async () => {
    const item = await findActiveContractItem(vendorId, "식용유", new Date("2026-12-01"));
    expect(item).toBeNull();
  });

  it("겹치는 기간의 새 계약은 overlap=true", async () => {
    const overlap = await hasOverlappingContract(vendorId, new Date("2026-06-01"), new Date("2026-09-30"));
    expect(overlap).toBe(true);
  });

  it("겹치지 않는 기간은 overlap=false", async () => {
    const overlap = await hasOverlappingContract(vendorId, new Date("2026-07-01"), new Date("2026-09-30"));
    expect(overlap).toBe(false);
  });

  it("자기 자신을 제외하면 overlap=false", async () => {
    const overlap = await hasOverlappingContract(
      vendorId,
      new Date("2026-01-01"),
      new Date("2026-06-30"),
      contractId
    );
    expect(overlap).toBe(false);
  });
});
