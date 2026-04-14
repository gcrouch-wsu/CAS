import { customAlphabet } from "nanoid";
import { NextResponse } from "next/server";
import { createPublication } from "@/lib/cas-store";
import { parseAndMergeCasWorkbooks, parseCasWorkbook } from "@/lib/parse-cas";
import { unauthorizedIfNotAdmin } from "@/lib/require-admin";

export const runtime = "nodejs";

const mkSlug = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 12);

export async function POST(request: Request) {
  const deny = await unauthorizedIfNotAdmin();
  if (deny) return deny;

  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    return NextResponse.json(
      {
        error:
          "BLOB_READ_WRITE_TOKEN is not set. In Vercel: open this project → Storage → create or connect a Blob store so the token is added, then redeploy.",
      },
      { status: 500 }
    );
  }

  const form = await request.formData();
  const titleRaw = form.get("title");
  const title =
    typeof titleRaw === "string" && titleRaw.trim()
      ? titleRaw.trim()
      : "CAS programs";

  /** Primary single file (legacy) */
  const file = form.get("file");
  /** Optional second file (legacy) */
  const file2 = form.get("file2");
  /** Same-time multi-select: `files` from input[multiple] */
  const multiRaw = form.getAll("files");
  const multiFiles = multiRaw.filter(
    (x): x is File => x instanceof File && x.size > 0
  );

  let parts: { buffer: Buffer; fileName: string }[] = [];

  if (multiFiles.length > 0) {
    parts = await Promise.all(
      multiFiles.map(async (f) => ({
        buffer: Buffer.from(await f.arrayBuffer()),
        fileName: f.name,
      }))
    );
  } else if (file instanceof File && file.size > 0) {
    parts = [{ buffer: Buffer.from(await file.arrayBuffer()), fileName: file.name }];
    if (file2 instanceof File && file2.size > 0) {
      parts.push({
        buffer: Buffer.from(await file2.arrayBuffer()),
        fileName: file2.name,
      });
    }
  }

  if (parts.length === 0) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  let data;
  try {
    if (parts.length === 1) {
      data = parseCasWorkbook(parts[0].buffer, parts[0].fileName);
    } else {
      data = parseAndMergeCasWorkbooks(parts);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Parse failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (data.groups.length === 0) {
    return NextResponse.json(
      { error: "No Program Attributes rows found (check sheet name and Program ID)." },
      { status: 400 }
    );
  }

  const slug = mkSlug();
  try {
    await createPublication({ slug, title, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Storage error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({
    slug,
    publicUrl: `/s/${slug}`,
    adminUrl: `/admin/${slug}`,
  });
}
