"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setMealRegistrationAttendance } from "@/actions/meal-actions";

export default function MealCheckinToggle({ id, initialAttended }: { id: string; initialAttended: boolean }) {
  const router = useRouter();
  const [attended, setAttended] = useState(initialAttended);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !attended;
    setAttended(next);
    startTransition(async () => {
      const result = await setMealRegistrationAttendance(id, next);
      if (!result.ok) {
        setAttended(!next);
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={`w-24 shrink-0 rounded-md px-3 py-3 text-sm font-bold transition disabled:opacity-60 ${
        attended ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-500"
      }`}
    >
      {attended ? "출석" : "미출석"}
    </button>
  );
}
