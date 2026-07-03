import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";

const settingsSchema = z.object({
  lunchStart: z.string().regex(/^\d{2}:\d{2}$/, "HH:mm 형식이어야 합니다."),
  lunchEnd: z.string().regex(/^\d{2}:\d{2}$/, "HH:mm 형식이어야 합니다."),
  dinnerStart: z.string().regex(/^\d{2}:\d{2}$/, "HH:mm 형식이어야 합니다."),
  dinnerEnd: z.string().regex(/^\d{2}:\d{2}$/, "HH:mm 형식이어야 합니다."),
});

export async function GET() {
  try {
    await requireSession();
    const settings = await db.mealTimeSettings.upsert({
      where: { id: "global" },
      update: {},
      create: { id: "global" },
    });
    return NextResponse.json({ ok: true, settings });
  } catch {
    return NextResponse.json({ ok: false, message: "설정을 불러오는 데 실패했습니다." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireSession();
    const body = await req.json();
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const settings = await db.mealTimeSettings.upsert({
      where: { id: "global" },
      update: parsed.data,
      create: { id: "global", ...parsed.data },
    });
    return NextResponse.json({ ok: true, settings });
  } catch {
    return NextResponse.json({ ok: false, message: "설정 저장에 실패했습니다." }, { status: 500 });
  }
}
