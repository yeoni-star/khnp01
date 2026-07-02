"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createDraftSlip } from "@/actions/slip-actions";

type ActionState = { ok: boolean; message?: string } | null;

export default function NewSlipForm({
  contracts,
  defaultVendor,
}: {
  contracts: { id: string; title: string | null; vendorId: string; vendor: { name: string }; startDate: Date; endDate: Date }[];
  defaultVendor: { id: string; name: string; categoryLabel: string | null } | null;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (_prev, formData) => createDraftSlip(formData),
    null
  );

  const today = new Date().toISOString().slice(0, 10);
  const [dateStr, setDateStr] = useState(today);

  const filteredContracts = contracts.filter((c) => {
    const sDate = c.startDate.toISOString().slice(0, 10);
    const eDate = c.endDate.toISOString().slice(0, 10);
    return sDate <= dateStr && eDate >= dateStr;
  });

  return (
    <form action={formAction} className="space-y-3 rounded-md border border-gray-200 bg-white p-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">납품일자 *</label>
          <input
            type="date"
            name="deliveryDate"
            required
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">계약 *</label>
          {defaultVendor ? (
            <div>
              <input type="hidden" name="vendorId" value={defaultVendor.id} />
              <p className="rounded border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm text-gray-900">
                {defaultVendor.name}
                {defaultVendor.categoryLabel ? `(${defaultVendor.categoryLabel})` : ""}
              </p>
              <Link href="/slips/new" className="mt-1 inline-block text-xs text-blue-600 hover:underline">
                다른 계약 선택
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
                계약 선택 ({filteredContracts.length}건)
              </option>
              {filteredContracts.map((c) => (
                <option key={c.id} value={c.vendorId}>
                  [{c.vendor.name}] {c.title || `${c.startDate.toISOString().slice(0, 10)} 계약`}
                </option>
              ))}
            </select>
          )}
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
