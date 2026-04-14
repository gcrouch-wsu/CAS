import { NextResponse } from "next/server";
import { getPublicationBySlug, toPublicPayload } from "@/lib/cas-store";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const row = await getPublicationBySlug(slug);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(toPublicPayload(row));
}
