"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { revertSlipToDraft } from "@/actions/slip-actions";

export default function RevertSlipButton({ slipId }: { slipId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRevert() {
    if (!confirm("확정을 취소하고 임시저장 상태로 되돌려 수정할까요?")) return;
    setError(null);
    startTransition(async () => {
      const res = await revertSlipToDraft(slipId);
      if (res.ok) {
        router.refresh();
      } else {
        setError((res as { message?: string }).message || "되돌리기에 실패했습니다.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleRevert}
        disabled={pending}
        className="rounded border border-amber-300 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-40"
      >
        {pending ? "되돌리는 중..." : "임시저장으로 되돌리기"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
