import { NextResponse } from "next/server";
import { mergePublicationFromUpload } from "@/lib/cas-store";
import { unauthorizedIfNotAdmin } from "@/lib/require-admin";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const deny = await unauthorizedIfNotAdmin();
  if (deny) return deny;
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    return NextResponse.json(
      { error: "BLOB_READ_WRITE_TOKEN is not set. Link a Blob store to this project." },
      { status: 500 }
    );
  }
  const { slug } = await ctx.params;
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  try {
    const updated = await mergePublicationFromUpload(slug, buf, file.name);
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({
      slug: updated.slug,
      sourceFileName: updated.data.sourceFileName,
      groupCount: updated.data.groups.length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Merge failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
