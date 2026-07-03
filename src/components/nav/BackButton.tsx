"use client";

import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 print:hidden"
    >
      ← 뒤로
    </button>
  );
}
