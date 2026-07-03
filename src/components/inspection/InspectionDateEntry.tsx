"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InspectionDateEntry() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const router = useRouter();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/inspection/${date}`);
      }}
      className="flex items-end gap-3 rounded-md border border-gray-200 bg-white p-4"
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">입고일자</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1.5 text-sm"
        />
      </div>
      <button
        type="submit"
        className="rounded bg-primary-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
      >
        검수일지 열기/작성
      </button>
    </form>
  );
}
