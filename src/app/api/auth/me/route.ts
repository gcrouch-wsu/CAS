import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/admin-session";

export const runtime = "nodejs";

export async function GET() {
  const jar = await cookies();
  const ok = await verifyAdminSession(jar.get(ADMIN_SESSION_COOKIE)?.value);
  if (!ok) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
