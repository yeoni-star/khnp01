import Link from "next/link";

export default function EntryPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            고리 구내식당 관리 시스템
          </h1>
          <p className="mt-1 text-sm text-gray-500">서비스를 선택해 주세요</p>
        </div>

        <div className="space-y-3">
          <Link
            href="/meal-register"
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition hover:border-emerald-400 hover:shadow-md"
          >
            <div>
              <p className="text-base font-semibold text-gray-900">식사 등록</p>
              <p className="mt-0.5 text-sm text-gray-500">외부업체 방문 시 식수 등록</p>
            </div>
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          <Link
            href="/dashboard"
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition hover:border-indigo-400 hover:shadow-md"
          >
            <div>
              <p className="text-base font-semibold text-gray-900">식재료 관리</p>
              <p className="mt-0.5 text-sm text-gray-500">관리자 전용 로그인 후 이용</p>
            </div>
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </main>
  );
}

