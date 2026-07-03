"use client";

import { useState } from "react";

export default function InspectionNoticeModal() {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-md bg-white p-5 shadow-lg">
        <h2 className="text-sm font-semibold text-gray-900">안내</h2>
        <p className="mt-2 text-sm text-gray-700">
          검수일지는 <strong>확정(확정 완료)된 거래명세표만</strong> 자동으로 불러옵니다. 아직 확정하지 않은
          거래명세표가 있다면, 먼저 해당 거래명세표를 확정해 주세요.
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-4 w-full rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          확인
        </button>
      </div>
    </div>
  );
}
