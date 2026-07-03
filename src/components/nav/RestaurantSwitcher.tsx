"use client";

import { useState, useTransition } from "react";
import { switchRestaurant } from "@/actions/auth-actions";
import { RESTAURANTS, RESTAURANT_LABELS, type RestaurantCode } from "@/lib/restaurants";

export default function RestaurantSwitcher({ current }: { current: RestaurantCode }) {
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<RestaurantCode | null>(null);

  function confirmSwitch() {
    if (!target) return;
    const next = target;
    setTarget(null);
    startTransition(async () => {
      await switchRestaurant(next);
    });
  }

  return (
    <>
      <div className="flex overflow-hidden rounded-full border border-gray-200">
        {RESTAURANTS.map((code) => {
          const active = code === current;
          return (
            <button
              key={code}
              type="button"
              disabled={active || pending}
              onClick={() => setTarget(code)}
              className={`px-3 py-1 text-sm font-medium ${
                active ? "bg-primary-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {RESTAURANT_LABELS[code]}
            </button>
          );
        })}
      </div>

      {target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-72 rounded-lg bg-white p-5 shadow-xl">
            <p className="text-sm font-medium text-gray-900">식당을 변경하시겠습니까?</p>
            <p className="mt-1 text-xs text-gray-500">
              {RESTAURANT_LABELS[current]} → {RESTAURANT_LABELS[target]}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setTarget(null)}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                아니오
              </button>
              <button
                type="button"
                onClick={confirmSwitch}
                className="rounded bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
              >
                예
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
