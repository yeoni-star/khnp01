"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteInspectionLog } from "@/actions/inspection-actions";

export default function DeleteInspectionLogButton({ logId }: { logId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("이 검수일지를 삭제할까요?")) return;
    startTransition(async () => {
      await deleteInspectionLog(logId);
      router.push("/inspection");
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
