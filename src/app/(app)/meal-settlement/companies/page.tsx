import Link from "next/link";
import { db } from "@/lib/db";
import MealCompanyManager from "@/components/meal/MealCompanyManager";

export default async function MealCompaniesPage() {
  const companies = await db.mealCompany.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, pricePerMeal: true, memo: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">외부업체 관리</h1>
          <p className="mt-1 text-sm text-gray-600">
            사원증 미등록 외부업체와 1식 단가를 등록합니다. 등록된 업체는 식사 등록 폼에 표시됩니다.
          </p>
        </div>
        <Link
          href="/meal-settlement"
          className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          식수 정산으로
        </Link>
      </div>

      <MealCompanyManager initialCompanies={companies} />
    </div>
  );
}
