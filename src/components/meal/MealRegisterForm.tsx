"use client";

import { useState, useTransition, type FormEvent } from "react";
import { submitMealRegistration } from "@/actions/meal-public-actions";
import { RESTAURANTS, RESTAURANT_LABELS, type RestaurantCode } from "@/lib/restaurants";

type Company = { id: string; name: string };

type SubmittedInfo = {
  submittedAt: string;
  companyName: string;
  restaurantLabel: string;
  submitterName: string;
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
        companyName: res.companyName,
        restaurantLabel: res.restaurantLabel,
        submitterName,
      });
    });
  }

  if (result) {
    const time = new Date(result.submittedAt);
    return (
      <div className="rounded-lg border border-primary-200 bg-primary-50 p-6 text-center">
        <p className="text-lg font-bold text-primary-700">제출 완료</p>
        <p className="mt-2 text-sm text-gray-700">이 화면을 영양사님께 보여주세요.</p>
        <div className="mt-4 space-y-1.5 rounded-md bg-white p-4 text-left text-sm text-gray-900">
          <p>
            <span className="text-gray-500">식당 : </span>
            {result.restaurantLabel}
          </p>
          <p>
            <span className="text-gray-500">소속 : </span>
            {result.companyName}
          </p>
          <p>
            <span className="text-gray-500">이름 : </span>
            {result.submitterName}
          </p>
          <p>
            <span className="text-gray-500">제출시각 : </span>
            {time.toLocaleString("ko-KR")}
          </p>
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
