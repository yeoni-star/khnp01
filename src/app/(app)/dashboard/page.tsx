import Link from "next/link";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import MealTimeSettingsPanel from "@/components/meal/MealTimeSettingsPanel";

export default async function DashboardPage() {
  const session = await getSession();
  const restaurant = session!.restaurant;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [draftCount, confirmedThisMonth, vendorCount] = await Promise.all([
    db.deliverySlip.count({ where: { restaurant, status: "DRAFT" } }),
    db.deliverySlip.count({
      where: { restaurant, status: "CONFIRMED", deliveryDate: { gte: monthStart } },
    }),
    db.vendor.count(),
  ]);

  const cards = [
    { label: "임시저장 거래명세표", value: draftCount, href: "/slips" },
    { label: "이번 달 확정 건수", value: confirmedThisMonth, href: "/slips" },
    { label: "등록 업체 수", value: vendorCount, href: "/contracts" },
  ];

  const quickLinks = [
    { label: "거래명세표 입력", href: "/slips/new" },
    { label: "검수일지", href: "/inspection" },
    { label: "납품보고서", href: "/reports" },
    { label: "식수 정산하기", href: "/meal-settlement" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">대시보드</h1>
        <p className="mt-1 text-sm text-gray-600">
          계약 관리, 거래명세표 입력, 기간별 납품보고서 메뉴를 이용해 주세요.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-md border border-gray-200 bg-white p-4 hover:border-primary-300"
          >
            <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
            <p className="mt-1 text-xs text-gray-500">{card.label}</p>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-gray-900">바로가기</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center justify-center rounded-lg bg-primary-50 px-6 py-4 text-base font-bold text-primary-700 shadow-sm transition-all hover:bg-primary-100 hover:shadow-md"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-gray-900">설정</h2>
        <MealTimeSettingsPanel />
      </div>
    </div>
  );
}
