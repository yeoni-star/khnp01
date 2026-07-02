"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function DateFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [startDate, setStartDate] = useState(searchParams.get("startDate") || "");
  const [endDate, setEndDate] = useState(searchParams.get("endDate") || "");

  const handleFilter = () => {
    const params = new URLSearchParams(searchParams);
    if (startDate) params.set("startDate", startDate);
    else params.delete("startDate");
    if (endDate) params.set("endDate", endDate);
    else params.delete("endDate");
    router.push(`?${params.toString()}`);
  };

  const handleReset = () => {
    setStartDate("");
    setEndDate("");
    router.push("?");
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        className="rounded border border-gray-300 px-2 py-1 text-xs"
      />
      <span className="text-gray-500">~</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        className="rounded border border-gray-300 px-2 py-1 text-xs"
      />
      <button
        onClick={handleFilter}
        className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
      >
        조회
      </button>
      {(startDate || endDate) && (
        <button
          onClick={handleReset}
          className="rounded text-xs text-gray-500 hover:underline"
        >
          초기화
        </button>
      )}
    </div>
  );
}
