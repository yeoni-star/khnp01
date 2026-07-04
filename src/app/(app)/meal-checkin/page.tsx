import Link from "next/link";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { determineMealType, DEFAULT_MEAL_TIME_SETTINGS, MEAL_TYPE_LABELS, kstTodayDate } from "@/lib/meal";
import type { MealTypeCode } from "@/lib/meal";
import MealCheckinToggle from "@/components/meal/MealCheckinToggle";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default async function MealCheckinPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; mealType?: string }>;
}) {
  const sp = await searchParams;
  const session = await getSession();
  const restaurant = session!.restaurant;

  const todayDate = kstTodayDate();
  const todayStr = todayDate.toISOString().slice(0, 10);
  const dateStr = sp.date && DATE_PATTERN.test(sp.date) ? sp.date : todayStr;
  const date = new Date(`${dateStr}T00:00:00.000Z`);

  const timeSettings = await db.mealTimeSettings.findUnique({ where: { id: "global" } });
  const autoMealType = determineMealType(new Date(), timeSettings ?? DEFAULT_MEAL_TIME_SETTINGS);
  const mealType: MealTypeCode =
    sp.mealType === "LUNCH" || sp.mealType === "DINNER" ? sp.mealType : autoMealType ?? "LUNCH";

  const registrations = await db.mealRegistration.findMany({
    where: { restaurant, mealDate: date, mealType },
    include: { company: true },
    orderBy: { submittedAt: "asc" },
  });

  const attendedCount = registrations.filter((r) => r.attended).length;

  function dayLink(offsetDays: number) {
    const d = new Date(date);
    d.setUTCDate(d.getUTCDate() + offsetDays);
    const s = d.toISOString().slice(0, 10);
    return `/meal-checkin?date=${s}&mealType=${mealType}`;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">식사 체크인</h1>
        <p className="mt-1 text-sm text-gray-600">번호를 부르는 사람을 명단에서 찾아 출석 체크해 주세요.</p>
      </div>

      <div className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-3">
        <Link href={dayLink(-1)} className="rounded px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
          &lt; 이전날
        </Link>
        <span className="text-base font-bold text-gray-900">{dateStr}</span>
        <Link href={dayLink(1)} className="rounded px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
          다음날 &gt;
        </Link>
      </div>

      <div className="flex gap-2">
        {(["LUNCH", "DINNER"] as const).map((mt) => (
          <Link
            key={mt}
            href={`/meal-checkin?date=${dateStr}&mealType=${mt}`}
            className={`flex-1 rounded-md border px-4 py-3 text-center text-base font-bold ${
              mealType === mt
                ? "border-primary-600 bg-primary-50 text-primary-700"
                : "border-gray-200 bg-white text-gray-500"
            }`}
          >
            {MEAL_TYPE_LABELS[mt]}
          </Link>
        ))}
      </div>

      <p className="text-sm text-gray-600">
        출석 {attendedCount} / 전체 {registrations.length}명
      </p>

      <div className="space-y-2">
        {registrations.map((r, i) => (
          <div
            key={r.id}
            className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-white p-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-base font-bold text-gray-700">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-gray-900">{r.submitterName}</p>
                <p className="truncate text-xs text-gray-500">
                  {r.company.name} · {r.phone}
                </p>
              </div>
            </div>
            <MealCheckinToggle id={r.id} initialAttended={r.attended} />
          </div>
        ))}
        {registrations.length === 0 && (
          <div className="rounded-md border border-gray-200 bg-white p-6 text-center text-gray-400">
            해당 날짜·끼니에 등록된 인원이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
