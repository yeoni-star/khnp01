"use client";

import { useState } from "react";

export default function DeleteSlipButton({ slipId }: { slipId: string }) {
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (!confirm("이 거래명세표를 삭제할까요?")) return;
    setPending(true);
    try {
      const res = await fetch(`/api/slips/${slipId}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) {
        alert(data.message ?? "삭제 중 오류가 발생했습니다.");
        return;
      }
      window.location.href = "/slips";
    } catch (e) {
      console.error("삭제 오류:", e);
      alert("삭제 중 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      className="rounded border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
    >
      {pending ? "삭제 중..." : "삭제"}
    </button>
  );
}
