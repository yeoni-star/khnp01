"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteSlip } from "@/actions/slip-actions";

export default function DeleteSlipButton({ slipId }: { slipId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("이 거래명세표를 삭제할까요?")) return;
    startTransition(async () => {
      await deleteSlip(slipId);
      router.push("/slips");
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      className="rounded border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
    >
      삭제
    </button>
  );
}
