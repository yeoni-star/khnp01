"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { copySlip } from "@/actions/slip-actions";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function CopySlipButton({ slipId }: { slipId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDialog, setShowDialog] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState(todayStr());
  const [error, setError] = useState<string | null>(null);

  function openDialog(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDeliveryDate(todayStr());
    setError(null);
    setShowDialog(true);
  }

  function handleCopy() {
    if (!deliveryDate) {
      setError("납품일자를 선택해 주세요.");
      return;
    }
    startTransition(async () => {
      const res = await copySlip(slipId, deliveryDate);
      if (res.ok && res.newId) {
        setShowDialog(false);
        router.push(`/slips/${res.newId}`);
      } else {
        setError((res as { message?: string }).message || "복사에 실패했습니다.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="text-primary-600 hover:underline disabled:opacity-50 cursor-pointer font-medium"
      >
        복사
      </button>

      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowDialog(false)}>
          <div className="w-80 rounded-lg bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-medium text-gray-900">복사한 임시저장 사본의 납품일자를 선택해 주세요.</p>
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="mt-3 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDialog(false)}
                disabled={isPending}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleCopy}
                disabled={isPending}
                className="rounded bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 cursor-pointer"
              >
                {isPending ? "복사 중..." : "복사"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
