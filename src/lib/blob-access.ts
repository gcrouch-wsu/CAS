/**
 * Vercel Blob access for publication JSON.
 * Use `private` when possible (objects require a token to read).
 * If your Blob store or existing objects are public-only, set CAS_BLOB_ACCESS=public.
 */
export type BlobAccessMode = "public" | "private";

export function getBlobAccessMode(): BlobAccessMode {
  const v = process.env.CAS_BLOB_ACCESS?.trim().toLowerCase();
  if (v === "public") return "public";
  return "private";
}
