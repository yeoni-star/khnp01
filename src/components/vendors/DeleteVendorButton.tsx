"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteVendor } from "@/actions/vendor-actions";

export default function DeleteVendorButton({
  vendorId,
  disabled,
}: {
  vendorId: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("이 업체를 삭제할까요?")) return;
    startTransition(async () => {
      const result = await deleteVendor(vendorId);
      if (result.ok) {
        router.push("/vendors");
      } else {
        alert(result.message);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={disabled || pending}
      title={disabled ? "계약 또는 거래명세표가 있는 업체는 삭제할 수 없습니다." : undefined}
      className="rounded border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      업체 삭제
    </button>
  );
}
