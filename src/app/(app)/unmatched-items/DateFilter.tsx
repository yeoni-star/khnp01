"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/categories";

export default function DateFilter({ vendors }: { vendors: { id: string; name: string }[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [startDate, setStartDate] = useState(searchParams.get("startDate") || "");
  const [endDate, setEndDate] = useState(searchParams.get("endDate") || "");
  const [restaurant, setRestaurant] = useState(searchParams.get("restaurant") || "all");
  const [category, setCategory] = useState(searchParams.get("category") || "all");
  const [vendorId, setVendorId] = useState(searchParams.get("vendorId") || "all");

  const applyParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    router.push(`?${params.toString()}`);
  };

  const handleFilter = () => {
    const params = new URLSearchParams(searchParams);
    if (startDate) params.set("startDate", startDate);
    else params.delete("startDate");
    if (endDate) params.set("endDate", endDate);
    else params.delete("endDate");
    if (restaurant && restaurant !== "all") params.set("restaurant", restaurant);
    else params.delete("restaurant");
    if (category && category !== "all") params.set("category", category);
    else params.delete("category");
    if (vendorId && vendorId !== "all") params.set("vendorId", vendorId);
    else params.delete("vendorId");
    router.push(`?${params.toString()}`);
  };

  const handleRestaurantChange = (value: string) => {
    setRestaurant(value);
    applyParam("restaurant", value);
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    applyParam("category", value);
  };

  const handleVendorChange = (value: string) => {
    setVendorId(value);
    applyParam("vendorId", value);
  };

  const handleReset = () => {
    setStartDate("");
    setEndDate("");
    setRestaurant("all");
    setCategory("all");
    setVendorId("all");
    router.push("?");
  };

  const hasActiveFilter =
    startDate || endDate || restaurant !== "all" || category !== "all" || vendorId !== "all";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={restaurant}
        onChange={(e) => handleRestaurantChange(e.target.value)}
        className="rounded border border-gray-300 px-2 py-1 text-xs bg-white text-gray-700 font-medium"
      >
        <option value="all">식당 전체</option>
        <option value="A">본관</option>
        <option value="B">후문</option>
      </select>
      <select
        value={category}
        onChange={(e) => handleCategoryChange(e.target.value)}
        className="rounded border border-gray-300 px-2 py-1 text-xs bg-white text-gray-700 font-medium"
      >
        <option value="all">카테고리 전체</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {CATEGORY_LABELS[c]}
          </option>
        ))}
      </select>
      <select
        value={vendorId}
        onChange={(e) => handleVendorChange(e.target.value)}
        className="rounded border border-gray-300 px-2 py-1 text-xs bg-white text-gray-700 font-medium"
      >
        <option value="all">업체 전체</option>
        {vendors.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
      </select>
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
        className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
      >
        조회
      </button>
      {hasActiveFilter && (
        <button
          onClick={handleReset}
          className="rounded text-xs text-gray-500 hover:underline cursor-pointer"
        >
          초기화
        </button>
      )}
    </div>
  );
}
