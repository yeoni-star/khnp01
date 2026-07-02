"use client";

import { useActionState, useEffect, useRef } from "react";
import { createVendor } from "@/actions/vendor-actions";

type ActionState = { ok: boolean; message?: string } | null;

export default function VendorForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (_prevState, formData) => createVendor(formData),
    null
  );

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3 rounded-md border border-gray-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-gray-900">새 업체 추가</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">업체명 *</label>
          <input name="name" required className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">사업자번호</label>
          <input name="businessNo" className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">연락처</label>
          <input name="contact" className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">메모</label>
          <input name="memo" className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
        </div>
      </div>
      {state && !state.ok && <p className="text-sm text-red-600">{state.message}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? "저장 중..." : "업체 추가"}
      </button>
    </form>
  );
}
