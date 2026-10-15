"use client";

import { useEffect, useRef, useState } from "react";
import { RESTAURANTS, RESTAURANT_LABELS, type RestaurantCode } from "@/lib/restaurants";
import {
  TAX_MODE_LABELS,
  computeProfit,
  computeRevenue,
  materialCostFor,
  parseSavedPrices,
  parseWholeNumber,
  type MaterialCost,
  type TaxMode,
} from "@/lib/profit-calc";

type Counts = Record<RestaurantCode, string[]>;
type RestaurantResult = { revenue: number; cost: number; profit: number };

type HistoryEntry = {
  id: number;
  time: string;
  prices: string[];
  counts: Counts;
  taxMode: TaxMode;
  results: Record<RestaurantCode, RestaurantResult>;
};

const DEFAULT_PRICES = ["4000", "4500", "5600"];
const TIER_LABELS = ["교대식수", "직원", "협력사"];
const MAX_HISTORY = 5;
const PRICES_STORAGE_KEY = "khnp:profit-calc:prices:v1";
// 식당별로 입력받지 않는 항목(본관은 교대식수 없음). 입력칸이 없으니 값은 항상 비어 있어 매출에 더해지지 않는다.
const HIDDEN_TIERS: Record<RestaurantCode, number[]> = { A: [0], B: [] };

function loadSavedPrices(): string[] {
  if (typeof window === "undefined") return DEFAULT_PRICES;
  try {
    return parseSavedPrices(window.localStorage.getItem(PRICES_STORAGE_KEY)) ?? DEFAULT_PRICES;
  } catch {
    return DEFAULT_PRICES;
  }
}

function emptyCounts(): Counts {
  return { A: ["", "", ""], B: ["", "", ""] };
}

function won(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}

function signedWon(n: number): string {
  return `${n > 0 ? "+" : ""}${n.toLocaleString("ko-KR")}원`;
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  return `${y}년 ${Number(m)}월`;
}

export default function ProfitCalculatorButton({
  month,
  cost,
}: {
  month: string;
  cost: Record<RestaurantCode, MaterialCost>;
}) {
  const [open, setOpen] = useState(false);
  const [taxMode, setTaxMode] = useState<TaxMode>("INCLUDED");
  const [initialPrices] = useState<string[]>(loadSavedPrices);
  const [savedPrices, setSavedPrices] = useState<string[]>(initialPrices);
  const [prices, setPrices] = useState<string[]>(initialPrices);
  const [saveError, setSaveError] = useState(false);
  const [counts, setCounts] = useState<Counts>(emptyCounts);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const historySeq = useRef(0);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function computeResults(): Record<RestaurantCode, RestaurantResult> {
    const out = {} as Record<RestaurantCode, RestaurantResult>;
    for (const r of RESTAURANTS) {
      const revenue = computeRevenue(prices, counts[r]);
      const materialCost = materialCostFor(cost[r], taxMode);
      out[r] = { revenue, cost: materialCost, profit: computeProfit(revenue, materialCost) };
    }
    return out;
  }

  const results = computeResults();

  const pricesSaved = prices.join(",") === savedPrices.join(",");

  function savePrices() {
    const normalized = prices.map((p) => String(parseWholeNumber(p)));
    try {
      window.localStorage.setItem(PRICES_STORAGE_KEY, JSON.stringify(normalized));
      setSaveError(false);
      setSavedPrices(normalized);
      setPrices(normalized);
    } catch {
      setSaveError(true);
    }
  }

  function setPrice(index: number, value: string) {
    setPrices((prev) => prev.map((p, i) => (i === index ? value.replace(/\D/g, "") : p)));
  }

  function setCount(restaurant: RestaurantCode, index: number, value: string) {
    setCounts((prev) => ({
      ...prev,
      [restaurant]: prev[restaurant].map((c, i) => (i === index ? value.replace(/\D/g, "") : c)),
    }));
  }

  function recordCalculation() {
    historySeq.current += 1;
    const entry: HistoryEntry = {
      id: historySeq.current,
      time: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
      prices: [...prices],
      counts: { A: [...counts.A], B: [...counts.B] },
      taxMode,
      results,
    };
    setHistory((prev) => [entry, ...prev].slice(0, MAX_HISTORY));
  }

  function restoreEntry(entry: HistoryEntry) {
    setPrices([...entry.prices]);
    setCounts({ A: [...entry.counts.A], B: [...entry.counts.B] });
    setTaxMode(entry.taxMode);
  }

  const inputClass =
    "rounded border border-gray-300 px-2 py-1.5 text-right text-sm focus:border-primary-500 focus:outline-none";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-primary-600 px-2 py-1 text-xs font-semibold text-primary-600 hover:bg-primary-50 mobile:px-3 mobile:py-2"
      >
        손익계산
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="손익계산"
            className="w-full max-w-3xl rounded-lg bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900">손익계산</h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  {monthLabel(month)} 확정 거래명세표 기준 · 인원 입력값과 계산 기록은 저장되지 않고, 단가만 저장할 수 있어요.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="shrink-0 rounded px-2 py-1 text-lg leading-none text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-md bg-gray-50 px-3 py-2">
                <span className="text-xs font-medium text-gray-600">식재료비 기준</span>
                {(Object.keys(TAX_MODE_LABELS) as TaxMode[]).map((mode) => (
                  <label key={mode} className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-700">
                    <input
                      type="radio"
                      name="profit-tax-mode"
                      checked={taxMode === mode}
                      onChange={() => setTaxMode(mode)}
                      className="h-4 w-4"
                    />
                    {TAX_MODE_LABELS[mode]}
                  </label>
                ))}
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-gray-600">단가 (수정 가능)</p>
                  <div className="flex items-center gap-2">
                    {saveError && <span className="text-[11px] text-red-600">이 브라우저에서는 저장할 수 없어요</span>}
                    <button
                      type="button"
                      onClick={savePrices}
                      disabled={pricesSaved}
                      className="rounded border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-default disabled:border-transparent disabled:bg-transparent disabled:text-gray-400"
                    >
                      {pricesSaved ? "저장됨" : "단가 저장"}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 items-end gap-2">
                  {TIER_LABELS.map((label, i) => (
                    <div key={label}>
                      <label className="mb-0.5 block text-[11px] text-gray-500">
                        {i === 0 ? "교대식수(후문) 단가(원)" : `${label} 단가(원)`}
                      </label>
                      <input
                        inputMode="numeric"
                        value={prices[i]}
                        onChange={(e) => setPrice(i, e.target.value)}
                        className={`${inputClass} w-full`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {RESTAURANTS.map((r) => {
                  const result = results[r];
                  const profitPositive = result.profit >= 0;
                  return (
                    <div key={r} className="rounded-md border border-gray-200 p-3">
                      <p className="mb-2 text-sm font-semibold text-gray-900">{RESTAURANT_LABELS[r]}</p>

                      <div className="space-y-2">
                        {TIER_LABELS.map((label, i) =>
                          HIDDEN_TIERS[r].includes(i) ? null : (
                          <div key={label} className="flex items-center gap-2">
                            <label className="w-16 shrink-0 text-xs text-gray-600">{label}</label>
                            <input
                              inputMode="numeric"
                              value={counts[r][i]}
                              onChange={(e) => setCount(r, i, e.target.value)}
                              placeholder="0"
                              className={`${inputClass} w-20 shrink-0`}
                            />
                            <span className="min-w-0 flex-1 text-right text-xs text-gray-500">
                              × {parseWholeNumber(prices[i]).toLocaleString("ko-KR")} ={" "}
                              {won(parseWholeNumber(prices[i]) * parseWholeNumber(counts[r][i]))}
                            </span>
                          </div>
                          )
                        )}
                      </div>

                      <dl className="mt-3 space-y-1 border-t border-gray-100 pt-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-gray-600">매출</dt>
                          <dd className="font-medium text-gray-900">{won(result.revenue)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-600">
                            − 식재료비 <span className="text-[11px] text-gray-400">(자동집계)</span>
                          </dt>
                          <dd className="font-medium text-gray-900">{won(result.cost)}</dd>
                        </div>
                        <p className="text-right text-[11px] text-gray-400">
                          공급가액 {won(cost[r].supply)} · 세액 {won(cost[r].tax)}
                        </p>
                        <div className="flex justify-between border-t border-gray-100 pt-1.5">
                          <dt className="font-semibold text-gray-800">= 손익</dt>
                          <dd className={`font-bold ${profitPositive ? "text-blue-600" : "text-red-600"}`}>
                            {signedWon(result.profit)}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-gray-500">식재료비는 확정된 거래명세표만 집계해요.</p>
                <button
                  type="button"
                  onClick={recordCalculation}
                  className="shrink-0 rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                >
                  계산 기록 남기기
                </button>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-xs font-medium text-gray-600">최근 계산 기록 (최대 {MAX_HISTORY}개)</p>
                  {history.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setHistory([])}
                      className="text-xs text-gray-400 hover:text-gray-700 hover:underline"
                    >
                      기록 지우기
                    </button>
                  )}
                </div>
                {history.length === 0 ? (
                  <p className="rounded-md border border-dashed border-gray-200 px-3 py-3 text-center text-xs text-gray-400">
                    아직 남긴 기록이 없어요.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {history.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-gray-200 px-3 py-2 text-xs"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-gray-400">
                            {entry.time} · {TAX_MODE_LABELS[entry.taxMode]} · 단가 {entry.prices.map((p) => parseWholeNumber(p).toLocaleString("ko-KR")).join("/")}
                          </p>
                          <p className="text-gray-700">
                            {RESTAURANTS.map((r) => (
                              <span key={r} className="mr-3">
                                {RESTAURANT_LABELS[r]}{" "}
                                <span className={entry.results[r].profit >= 0 ? "text-blue-600" : "text-red-600"}>
                                  {signedWon(entry.results[r].profit)}
                                </span>
                              </span>
                            ))}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => restoreEntry(entry)}
                          className="shrink-0 rounded border border-gray-300 px-2 py-1 text-gray-600 hover:bg-gray-50"
                        >
                          불러오기
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
