import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { unauthorizedIfNotAdmin } from "@/lib/require-admin";

export const runtime = "nodejs";
export const maxDuration = 60;

const SLUG_RE = /^[a-z0-9]{8,32}$/;

/**
 * Token endpoint for browser → Vercel Blob direct uploads (bypasses ~4.5MB serverless body limit).
 * Used by merge flow: stage workbook under `cas-merge-staging/{slug}/…`, then finalize via POST merge JSON.
 */
export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    return NextResponse.json(
      { error: "BLOB_READ_WRITE_TOKEN is not set." },
      { status: 500 }
    );
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only the browser token request carries the admin session. Upload-completed callbacks
  // come from Vercel Blob and are verified inside `handleUpload` via signed payloads.
  if (body.type === "blob.generate-client-token") {
    const deny = await unauthorizedIfNotAdmin();
    if (deny) return deny;
  }

  try {
    const jsonResponse = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let slug: string | null = null;
        try {
          slug = clientPayload
            ? ((JSON.parse(clientPayload) as { slug?: string }).slug ?? null)
            : null;
        } catch {
          throw new Error("Invalid clientPayload");
        }
        if (!slug || !SLUG_RE.test(slug)) {
          throw new Error("Invalid slug");
        }
        const prefix = `cas-merge-staging/${slug}/`;
        if (!pathname.startsWith(prefix)) {
          throw new Error("Invalid pathname");
        }
        return {
          allowedContentTypes: [
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel",
            "application/octet-stream",
          ],
          maximumSizeInBytes: 100 * 1024 * 1024,
          addRandomSuffix: false,
          allowOverwrite: true,
          tokenPayload: JSON.stringify({ slug }),
        };
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Token request failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
