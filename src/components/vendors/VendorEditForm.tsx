"use client";

import { useActionState, useState } from "react";
import { updateVendor } from "@/actions/vendor-actions";

type ActionState = { ok: boolean; message?: string } | null;

type Vendor = {
  id: string;
  name: string;
  businessNo: string | null;
  contact: string | null;
  memo: string | null;
};

export default function VendorEditForm({ vendor }: { vendor: Vendor }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (_prev, formData) => {
      const result = await updateVendor(vendor.id, formData);
      if (result.ok) setEditing(false);
      return result;
    },
    null
  );

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        정보 수정
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-md border border-gray-200 bg-white p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">업체명 *</label>
          <input
            name="name"
            required
            defaultValue={vendor.name}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">사업자번호</label>
          <input
            name="businessNo"
            defaultValue={vendor.businessNo ?? ""}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">연락처</label>
          <input
            name="contact"
            defaultValue={vendor.contact ?? ""}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">메모</label>
          <input
            name="memo"
            defaultValue={vendor.memo ?? ""}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
      </div>
      {state && !state.ok && <p className="text-sm text-red-600">{state.message}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? "저장 중..." : "저장"}
        </button>
      </div>
    </form>
  );
}
