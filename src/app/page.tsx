import Link from "next/link";

export default function EntryPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="mb-2 text-center text-xl font-semibold text-gray-900">납품보고서 관리 시스템</h1>

        <Link
          href="/dashboard"
          className="block rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm transition hover:border-primary-300 hover:shadow-md"
        >
          <p className="text-lg font-bold text-gray-900">식재료 관리 프로그램</p>
          <p className="mt-1 text-sm text-gray-500">로그인 후 이용</p>
        </Link>

        <Link
          href="/meal-register"
          className="block rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm transition hover:border-primary-300 hover:shadow-md"
        >
          <p className="text-lg font-bold text-gray-900">식사 등록</p>
          <p className="mt-1 text-sm text-gray-500">외부업체 방문 식사 등록</p>
        </Link>
      </div>
    </main>
  );
}
