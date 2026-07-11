"use client";

import { useState } from "react";

export default function CollapsibleSettingsSection({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
      >
        설정
        <span className="text-gray-400">{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && <div className="space-y-4">{children}</div>}
    </div>
  );
}
