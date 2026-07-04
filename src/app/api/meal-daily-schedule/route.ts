import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { RESTAURANTS } from "@/lib/restaurants";
import { MEAL_TYPES, kstTodayDate, WEEKDAY_LABELS, defaultMealScheduleEnabled } from "@/lib/meal";

/** 아직 지나지 않은 평일(월~금) 5일을 반환한다. 평일이면 이번주, 주말이면 다음주 기준. */
function getUpcomingWeekWeekdays(today: Date): Date[] {
  const dayOfWeek = today.getUTCDay(); // 0=일 ~ 6=토
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() + mondayOffset + (isWeekend ? 7 : 0));

  const dates: Date[] = [];
  for (let d = 0; d < 5; d++) {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + d);
    dates.push(date);
  }
  return dates;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  try {
    await requireSession();
    const today = kstTodayDate();

    // 지난 날짜 데이터는 더 이상 필요 없으므로 조회 시점에 정리한다.
    await db.mealDailySchedule.deleteMany({ where: { date: { lt: today } } });

    const dates = getUpcomingWeekWeekdays(today);
    const rangeStart = dates[0];
    const rangeEnd = dates[dates.length - 1];

    const rows = await db.mealDailySchedule.findMany({
      where: { date: { gte: rangeStart, lte: rangeEnd } },
    });
    const map = new Map(rows.map((r) => [`${toDateStr(r.date)}_${r.restaurant}_${r.mealType}`, r.enabled]));

    const days = dates.map((date) => {
      const dateStr = toDateStr(date);
      return {
        date: dateStr,
        weekdayLabel: WEEKDAY_LABELS[date.getUTCDay()],
        cells: RESTAURANTS.flatMap((restaurant) =>
          MEAL_TYPES.map((mealType) => ({
            restaurant,
            mealType,
            enabled: map.get(`${dateStr}_${restaurant}_${mealType}`) ?? defaultMealScheduleEnabled(mealType),
          }))
        ),
      };
    });

    return NextResponse.json({ ok: true, days });
  } catch {
    return NextResponse.json({ ok: false, message: "설정을 불러오는 데 실패했습니다." }, { status: 500 });
  }
}

const patchSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    restaurant: z.enum(["A", "B"]),
    mealType: z.enum(["LUNCH", "DINNER"]),
    enabled: z.boolean(),
  })
  .refine((v) => v.date || (v.dates && v.dates.length > 0), { message: "날짜를 지정해 주세요." });

/** 단일 날짜(date) 또는 여러 날짜 일괄 적용(dates)을 지원한다. */
export async function PATCH(req: NextRequest) {
  try {
    await requireSession();
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: parsed.error.issues[0]?.message ?? "요청을 확인해 주세요." },
        { status: 400 }
      );
    }
    const { date, dates, restaurant, mealType, enabled } = parsed.data;
    const dateList = dates ?? [date!];

    await db.$transaction(
      dateList.map((dateStr) =>
        db.mealDailySchedule.upsert({
          where: {
            date_restaurant_mealType: { date: new Date(`${dateStr}T00:00:00.000Z`), restaurant, mealType },
          },
          update: { enabled },
          create: { date: new Date(`${dateStr}T00:00:00.000Z`), restaurant, mealType, enabled },
        })
      )
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, message: "설정 저장에 실패했습니다." }, { status: 500 });
  }
}
