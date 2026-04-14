import { NextResponse } from "next/server";
import { z } from "zod";
import { getPublicationBySlug, updatePublication } from "@/lib/cas-store";
import { unauthorizedIfNotAdmin } from "@/lib/require-admin";

export const runtime = "nodejs";

const termFieldSettingSchema = z.object({
  key: z.string(),
  label: z.string(),
  visible: z.boolean(),
});

const patchSchema = z.object({
  title: z.string().min(0).max(500).optional(),
  visibleColumnKeys: z.array(z.string()).optional(),
  defaultGroupKey: z.string().optional(),
  showOrgOnPublic: z.boolean().optional(),
  visibleQuestionColumns: z.array(z.string()).optional(),
  visibleAnswerColumns: z.array(z.string()).optional(),
  visibleDocumentColumns: z.array(z.string()).optional(),
  termFieldSettings: z.array(termFieldSettingSchema).optional(),
});

export async function GET(
  _request: Request,
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
  const row = await getPublicationBySlug(slug);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    slug: row.slug,
    title: row.title,
    visibleColumnKeys: row.visible_columns,
    defaultGroupKey: row.default_group_key,
    showOrgOnPublic: row.show_org_on_public,
    summaryColumnOptions: row.data.summaryColumnOptions,
    questionColumnOptions: row.data.questionColumnOptions,
    answerColumnOptions: row.data.answerColumnOptions,
    documentColumnOptions: row.data.documentColumnOptions,
    visibleQuestionColumns: row.visible_question_columns,
    visibleAnswerColumns: row.visible_answer_columns,
    visibleDocumentColumns: row.visible_document_columns,
    termFieldSettings: row.term_field_settings,
    groupKeys: row.data.groups.map((g) => ({
      key: g.groupKey,
      label: g.displayName,
    })),
    sourceFileName: row.data.sourceFileName,
  });
}

export async function PATCH(
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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  let updated;
  try {
    updated = await updatePublication(slug, parsed.data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Update failed";
    if (msg === "Invalid defaultGroupKey") {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    slug: updated.slug,
    title: updated.title,
    visibleColumnKeys: updated.visible_columns,
    defaultGroupKey: updated.default_group_key,
    showOrgOnPublic: updated.show_org_on_public,
    visibleQuestionColumns: updated.visible_question_columns,
    visibleAnswerColumns: updated.visible_answer_columns,
    visibleDocumentColumns: updated.visible_document_columns,
    termFieldSettings: updated.term_field_settings,
  });
}
