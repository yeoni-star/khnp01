"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { copySlip } from "@/actions/slip-actions";

export default function CopySlipButton({ slipId }: { slipId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleCopy = () => {
    if (confirm("이 거래명세표를 복사하여 오늘 날짜의 임시저장 사본으로 생성하시겠습니까?")) {
      startTransition(async () => {
        const res = await copySlip(slipId);
        if (res.ok && res.newId) {
          router.push(`/slips/${res.newId}`);
        } else {
          alert((res as any).message || "복사에 실패했습니다.");
        }
      });
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={isPending}
      className="text-primary-600 hover:underline disabled:opacity-50 cursor-pointer font-medium"
    >
      {isPending ? "복사 중..." : "복사"}
    </button>
  );
}
