import Link from "next/link";
import RestaurantSwitcher from "./RestaurantSwitcher";
import type { RestaurantCode } from "@/lib/restaurants";

const NAV_ITEMS = [
  { href: "/dashboard", label: "홈" },
  { href: "/contracts", label: "계약/단가" },
  { href: "/slips", label: "거래명세표" },
  { href: "/unmatched-items", label: "미등록 품목" },
  { href: "/inspection", label: "검수일지" },
  { href: "/reports", label: "기간별 납품보고서" },
];

export default function AppNav({ restaurant }: { restaurant: RestaurantCode }) {
  return (
    <header className="border-b border-gray-200 bg-white print:hidden">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-3 mobile:gap-2 mobile:px-4 mobile:py-2">
        <div className="flex flex-wrap items-center gap-4 mobile:w-full mobile:flex-col mobile:items-start mobile:gap-1">
          <span className="text-sm font-semibold text-gray-900">고리 구내식당 관리</span>
          <nav className="flex flex-wrap gap-3 text-sm text-gray-600 mobile:-mx-4 mobile:w-[calc(100%+2rem)] mobile:flex-nowrap mobile:gap-1 mobile:overflow-x-auto mobile:px-4">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="hover:text-primary-600 mobile:shrink-0 mobile:whitespace-nowrap mobile:rounded-full mobile:bg-gray-100 mobile:px-3 mobile:py-1.5"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm mobile:w-full mobile:justify-between">
          <RestaurantSwitcher current={restaurant} />
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
