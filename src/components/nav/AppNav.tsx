import Link from "next/link";

const NAV_ITEMS = [
  { href: "/", label: "홈" },
  { href: "/vendors", label: "업체" },
  { href: "/contracts", label: "계약/단가" },
  { href: "/slips", label: "거래명세표" },
  { href: "/unmatched-items", label: "미등록 품목" },
  { href: "/reports", label: "월별 납품보고서" },
  { href: "/required-quantity", label: "소요수량 산출" },
];

export default function AppNav({ restaurantLabel }: { restaurantLabel: string }) {
  return (
    <header className="border-b border-gray-200 bg-white print:hidden">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-semibold text-gray-900">납품보고서 관리</span>
          <nav className="flex flex-wrap gap-3 text-sm text-gray-600">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-blue-600">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700">
            {restaurantLabel}
          </span>
          <form action="/logout" method="POST">
            <button type="submit" className="text-gray-500 hover:text-gray-800">
              로그아웃
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
