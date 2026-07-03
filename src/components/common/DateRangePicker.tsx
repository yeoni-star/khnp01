"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DateRangePicker({
  basePath,
  defaultStart,
  defaultEnd,
}: {
  basePath: string;
  defaultStart: string;
  defaultEnd: string;
}) {
  const router = useRouter();
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);

  const apply = () => {
    router.push(`${basePath}?start=${start}&end=${end}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-gray-200 bg-white p-4 shadow-sm print:hidden">
      <div className="flex items-center gap-2">
        <label htmlFor="start" className="text-sm font-bold text-gray-700">
          정산기간
        </label>
        <input
          type="date"
          id="start"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        />
        <span className="text-gray-500">~</span>
        <input
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        />
      </div>
      <button
        onClick={apply}
        className="rounded bg-primary-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
      >
        조회
      </button>
    </div>
  );
}
