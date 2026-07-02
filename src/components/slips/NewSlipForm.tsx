"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createDraftSlip } from "@/actions/slip-actions";

type ActionState = { ok: boolean; message?: string } | null;

export default function NewSlipForm({
  vendors,
  defaultVendor,
}: {
  vendors: { id: string; name: string }[];
  defaultVendor: { id: string; name: string; categoryLabel: string | null } | null;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (_prev, formData) => createDraftSlip(formData),
    null
  );

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-3 rounded-md border border-gray-200 bg-white p-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">업체 *</label>
          {defaultVendor ? (
            <div>
              <input type="hidden" name="vendorId" value={defaultVendor.id} />
              <p className="rounded border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm text-gray-900">
                {defaultVendor.name}
                {defaultVendor.categoryLabel ? `(${defaultVendor.categoryLabel})` : ""}
              </p>
              <Link href="/slips/new" className="mt-1 inline-block text-xs text-blue-600 hover:underline">
                다른 업체 선택
              </Link>
            </div>
          ) : (
            <select
              name="vendorId"
              required
              defaultValue=""
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value="" disabled>
                업체 선택
              </option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">납품일자 *</label>
          <input
            type="date"
            name="deliveryDate"
            required
            defaultValue={today}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
      </div>
      {state && !state.ok && <p className="text-sm text-red-600">{state.message}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? "생성 중..." : "다음: 품목 입력"}
      </button>
    </form>
  );
}
