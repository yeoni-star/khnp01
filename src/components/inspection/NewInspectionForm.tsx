"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewInspectionForm() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const router = useRouter();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/inspection/${date}`);
      }}
      className="flex items-center gap-2"
    >
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
        required
      />
      <button
        type="submit"
        className="rounded bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
      >
        새 검수일지
      </button>
    </form>
  );
}
