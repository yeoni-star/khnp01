"use client";

import { useState, useTransition, type FormEvent } from "react";
import { submitMealRegistration } from "@/actions/meal-public-actions";
import { RESTAURANTS, RESTAURANT_LABELS, type RestaurantCode } from "@/lib/restaurants";

type Company = { id: string; name: string };

type SubmittedInfo = {
  submittedAt: string;
  mealDate: string;
  mealTypeLabel: string;
  companyName: string;
  restaurantLabel: string;
  submitterName: string;
  sequenceNumber: number;
};

export default function MealRegisterForm({ companies }: { companies: Company[] }) {
  const [restaurant, setRestaurant] = useState<RestaurantCode>("A");
  const [companyId, setCompanyId] = useState("");
  const [submitterName, setSubmitterName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<SubmittedInfo | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await submitMealRegistration({ restaurant, companyId, submitterName, phone });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setResult({
        submittedAt: res.submittedAt,
        mealDate: res.mealDate,
        mealTypeLabel: res.mealTypeLabel,
        companyName: res.companyName,
        restaurantLabel: res.restaurantLabel,
        submitterName,
        sequenceNumber: res.sequenceNumber,
      });
    });
  }

  if (result) {
    const submittedTime = new Date(result.submittedAt);
    const dateLabel = new Date(`${result.mealDate}T00:00:00`).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    });

    const isDinner = result.mealTypeLabel === "석식";
    const borderColor = isDinner ? "border-orange-300" : "border-primary-300";
    const bgColor = isDinner ? "bg-orange-50" : "bg-primary-50";
    const textColor = isDinner ? "text-orange-600" : "text-primary-600";
    const badgeBg = isDinner ? "bg-orange-600" : "bg-primary-600";

    return (
      <div className={`relative rounded-lg border-2 ${borderColor} ${bgColor} p-6 text-center`}>
        <div className="absolute left-4 top-4 text-4xl font-black text-red-600">
          #{result.sequenceNumber}
        </div>

        <p className={`text-sm font-bold ${textColor}`}>제출 완료</p>
        <p className="mt-1 text-xs text-gray-500">이 화면을 영양사님께 보여주세요.</p>

        <div className="mt-6 flex flex-col items-center justify-center gap-3">
          <span className="text-3xl font-black tracking-tight text-gray-900">{dateLabel}</span>
          <span className={`rounded-full ${badgeBg} px-6 py-2 text-2xl font-black text-white shadow-sm`}>
            {result.mealTypeLabel}
          </span>
        </div>

        <p className="mt-5 text-3xl font-extrabold text-gray-900">{result.submitterName}</p>
        <p className="mt-1 text-lg font-medium text-gray-600">{result.companyName}</p>

        <div className="mt-5 space-y-1 rounded-md bg-white p-3 text-sm text-gray-500">
          <p>식당 : {result.restaurantLabel}</p>
          <p>제출시각 : {submittedTime.toLocaleString("ko-KR")}</p>
        </div>

        <button
          type="button"
          onClick={() => {
            setResult(null);
            setSubmitterName("");
            setPhone("");
            setCompanyId("");
          }}
          className="mt-4 text-sm text-gray-500 underline hover:text-gray-700"
        >
          다시 등록
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">식당</label>
        <div className="flex gap-2">
          {RESTAURANTS.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setRestaurant(code)}
              className={`flex-1 rounded border px-3 py-2 text-sm font-medium ${
                restaurant === code
                  ? "border-primary-600 bg-primary-50 text-primary-700"
                  : "border-gray-300 text-gray-600"
              }`}
            >
              {RESTAURANT_LABELS[code]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="companyId" className="mb-1 block text-sm font-medium text-gray-700">
          소속 업체
        </label>
        <select
          id="companyId"
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          required
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">선택해 주세요</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {companies.length === 0 && (
          <p className="mt-1 text-xs text-amber-600">등록된 업체가 없습니다. 영양사님께 문의해 주세요.</p>
        )}
      </div>

      <div>
        <label htmlFor="submitterName" className="mb-1 block text-sm font-medium text-gray-700">
          이름
        </label>
        <input
          id="submitterName"
          value={submitterName}
          onChange={(e) => setSubmitterName(e.target.value)}
          required
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label htmlFor="phone" className="mb-1 block text-sm font-medium text-gray-700">
          연락처
        </label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="010-0000-0000"
          required
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending || !companyId}
        className="w-full rounded-md bg-primary-600 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
      >
        {pending ? "제출 중..." : "제출"}
      </button>
    </form>
  );
}
