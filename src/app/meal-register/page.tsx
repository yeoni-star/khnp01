import { db } from "@/lib/db";
import MealRegisterForm from "@/components/meal/MealRegisterForm";

export const dynamic = "force-dynamic";

export default async function MealRegisterPage() {
  const companies = await db.mealCompany.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-xl font-semibold text-gray-900">식사 등록</h1>
        <MealRegisterForm companies={companies} />
      </div>
    </main>
  );
}
