import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "./admin-session";

export async function unauthorizedIfNotAdmin(): Promise<NextResponse | null> {
  const jar = await cookies();
  const ok = await verifyAdminSession(jar.get(ADMIN_SESSION_COOKIE)?.value);
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
