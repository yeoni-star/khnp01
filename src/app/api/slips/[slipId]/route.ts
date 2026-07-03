import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slipId: string }> }
) {
  try {
    await requireSession();
    const { slipId } = await params;
    await db.deliverySlip.delete({ where: { id: slipId } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "삭제 실패";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ ok: false, message: "로그인이 필요합니다." }, { status: 401 });
    }
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
