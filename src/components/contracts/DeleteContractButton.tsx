"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteContract } from "@/actions/contract-actions";

export default function DeleteContractButton({ contractId }: { contractId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("이 계약을 삭제할까요? 단가표도 함께 삭제됩니다.")) return;
    startTransition(async () => {
      await deleteContract(contractId);
      router.push("/contracts");
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      className="rounded border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
    >
      계약 삭제
    </button>
  );
}
