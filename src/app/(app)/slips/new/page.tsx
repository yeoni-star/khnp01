import { db } from "@/lib/db";
import { isOcrConfigured } from "@/lib/env";
import NewSlipForm from "@/components/slips/NewSlipForm";

export default async function NewSlipPage() {
  const vendors = await db.vendor.findMany({ orderBy: { name: "asc" } });
  const ocrReady = isOcrConfigured();

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-gray-900">거래명세표 입력</h1>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div
          className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-400"
          title={
            ocrReady ? undefined : "OCR가 아직 설정되지 않아 사용할 수 없습니다. 아래에서 직접 입력해 주세요."
          }
        >
          <p className="font-medium">영수증 업로드 (PDF/JPG)</p>
          <p className="mt-1 text-xs">
            {ocrReady
              ? "다음 화면에서 업로드하면 자동으로 품목을 인식합니다."
              : "현재는 사용할 수 없습니다 — 아래에서 직접 입력해 주세요."}
          </p>
        </div>
        <div className="rounded-md border border-gray-200 bg-white p-4 text-sm text-gray-700">
          <p className="font-medium text-gray-900">직접 입력</p>
          <p className="mt-1 text-xs text-gray-500">업체와 납품일자를 선택하고 품목을 직접 입력합니다.</p>
        </div>
      </div>

      <NewSlipForm vendors={vendors} />
    </div>
  );
}
