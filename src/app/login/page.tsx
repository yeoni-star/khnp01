"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { RESTAURANTS, RESTAURANT_LABELS, type RestaurantCode } from "@/lib/restaurants";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [password, setPassword] = useState("");
  const [restaurant, setRestaurant] = useState<RestaurantCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password) {
      setError("비밀번호를 입력해 주세요.");
      return;
    }
    setError(null);
    setStep(2);
  }

  async function handleRestaurantSubmit(e: FormEvent) {
    e.preventDefault();
    if (!restaurant) {
      setError("식당을 선택해 주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, restaurant }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message ?? "로그인에 실패했습니다.");
        setStep(1);
        setPassword("");
        setLoading(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("로그인 중 오류가 발생했습니다. 다시 시도해 주세요.");
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-center text-xl font-semibold">납품보고서 관리 시스템</h1>

        {step === 1 && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              다음
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleRestaurantSubmit} className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">식당을 선택해 주세요</p>
              <div className="grid grid-cols-2 gap-3">
                {RESTAURANTS.map((code) => (
                  <button
                    type="button"
                    key={code}
                    onClick={() => setRestaurant(code)}
                    className={`rounded-md border py-3 text-sm font-medium ${
                      restaurant === code
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {RESTAURANT_LABELS[code]}
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 rounded-md border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                이전
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "로그인 중..." : "로그인"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
