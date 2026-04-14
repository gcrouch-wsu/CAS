import { get, put } from "@vercel/blob";
import type {
  CasPublicationData,
  PublicPublicationPayload,
  PublicProgramGroup,
  TermFieldSetting,
} from "./types";
import { getBlobAccessMode } from "./blob-access";
import {
  defaultVisibleColumns,
  ensurePublicationColumnMetadata,
  ensurePublicationOfferingShapes,
  filterRecordRows,
  mergePublicationData,
  mergeTermFieldSettings,
  mergeVisibleDetailKeys,
  parseCasWorkbook,
  pickVisibleShared,
  publicationUiDefaults,
} from "./parse-cas";

const BLOB_PREFIX = "cas-publications";

/** Stored as one JSON file per publication in Vercel Blob. */
export type StoredPublicationBlob = {
  version: 1;
  slug: string;
  title: string;
  visible_columns: string[];
  default_group_key: string;
  /** When false, public view hides organization-level Org Questions / Org Answers. */
  show_org_on_public?: boolean;
  /** Public program-question table columns (keys). */
  visible_question_columns?: string[];
  visible_answer_columns?: string[];
  visible_document_columns?: string[];
  /** Labels and visibility for application-window bullets. */
  term_field_settings?: TermFieldSetting[];
  data: CasPublicationData;
  created_at: string;
  updated_at: string;
};

export type PublicationRow = {
  id: string;
  slug: string;
  title: string;
  visible_columns: string[];
  default_group_key: string;
  show_org_on_public: boolean;
  visible_question_columns: string[];
  visible_answer_columns: string[];
  visible_document_columns: string[];
  term_field_settings: TermFieldSetting[];
  data: CasPublicationData;
  created_at: string;
  updated_at: string;
};

type StoredGroup = CasPublicationData["groups"][number];

function requireBlobToken(): string {
  const t = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!t) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set.");
  }
  return t;
}

function publicationPathname(slug: string): string {
  if (!/^[a-z0-9]{8,32}$/.test(slug)) {
    throw new Error("Invalid slug");
  }
  return `${BLOB_PREFIX}/${slug}.json`;
}

function blobToRow(parsed: StoredPublicationBlob): PublicationRow {
  const data = ensurePublicationOfferingShapes(ensurePublicationColumnMetadata(parsed.data));
  const ui = publicationUiDefaults(data);
  const visible_question_columns = mergeVisibleDetailKeys(
    parsed.visible_question_columns,
    data.questionColumnOptions,
    ui.visible_question_columns
  );
  const visible_answer_columns = mergeVisibleDetailKeys(
    parsed.visible_answer_columns,
    data.answerColumnOptions,
    ui.visible_answer_columns
  );
  const visible_document_columns = mergeVisibleDetailKeys(
    parsed.visible_document_columns,
    data.documentColumnOptions,
    ui.visible_document_columns
  );
  const term_field_settings = mergeTermFieldSettings(
    parsed.term_field_settings,
    ui.term_field_settings
  );
  return {
    id: parsed.slug,
    slug: parsed.slug,
    title: parsed.title,
    visible_columns: parsed.visible_columns,
    default_group_key: parsed.default_group_key,
    show_org_on_public: parsed.show_org_on_public !== false,
    visible_question_columns,
    visible_answer_columns,
    visible_document_columns,
    term_field_settings,
    data,
    created_at: parsed.created_at,
    updated_at: parsed.updated_at,
  };
}

async function persistBlob(body: StoredPublicationBlob): Promise<void> {
  const token = requireBlobToken();
  await put(publicationPathname(body.slug), JSON.stringify(body), {
    access: getBlobAccessMode(),
    token,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

function mapToPublicGroup(
  g: StoredGroup,
  visibleColumnKeys: string[],
  questionKeys: string[],
  answerKeys: string[],
  documentKeys: string[]
): PublicProgramGroup {
  return {
    groupKey: g.groupKey,
    displayName: g.displayName,
    visibleShared: pickVisibleShared(g.shared, visibleColumnKeys),
    offerings: g.offerings,
    recommendations: g.recommendations,
    recommendationNote: g.recommendationNote,
    questions: filterRecordRows(g.questions, questionKeys),
    documents: filterRecordRows(g.documents, documentKeys),
    answers: filterRecordRows(g.answers, answerKeys),
  };
}

export function toPublicPayload(row: PublicationRow): PublicPublicationPayload {
  const data = row.data;
  const keys = row.visible_columns ?? [];
  const showOrg = row.show_org_on_public;
  const qk = row.visible_question_columns;
  const ak = row.visible_answer_columns;
  const dk = row.visible_document_columns;
  return {
    title: row.title,
    slug: row.slug,
    defaultGroupKey: row.default_group_key || data.groups[0]?.groupKey || "",
    visibleColumnKeys: keys,
    showOrgContent: showOrg,
    termFieldSettings: row.term_field_settings,
    visibleQuestionColumnKeys: qk,
    visibleAnswerColumnKeys: ak,
    visibleDocumentColumnKeys: dk,
    orgQuestions: showOrg ? data.orgQuestions : [],
    orgAnswers: showOrg ? data.orgAnswers : [],
    groups: data.groups.map((g) => mapToPublicGroup(g, keys, qk, ak, dk)),
  };
}

export async function getPublicationBySlug(
  slug: string
): Promise<PublicationRow | null> {
  if (!/^[a-z0-9]{8,32}$/.test(slug)) {
    return null;
  }
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    return null;
  }
  const pathname = publicationPathname(slug);
  const access = getBlobAccessMode();
  try {
    const res = await get(pathname, {
      access,
      token,
      useCache: false,
    });
    if (!res?.stream) {
      return null;
    }
    const text = await new Response(res.stream as ReadableStream).text();
    const parsed = JSON.parse(text) as StoredPublicationBlob;
    if (parsed.version !== 1 || parsed.slug !== slug) {
      return null;
    }
    return blobToRow(parsed);
  } catch {
    return null;
  }
}

export async function createPublication(input: {
  slug: string;
  title: string;
  data: CasPublicationData;
}): Promise<void> {
  const data = ensurePublicationOfferingShapes(ensurePublicationColumnMetadata(input.data));
  const vis = defaultVisibleColumns(data.summaryColumnOptions);
  const defaultGroupKey = data.groups[0]?.groupKey ?? "";
  const ui = publicationUiDefaults(data);
  const now = new Date().toISOString();
  const body: StoredPublicationBlob = {
    version: 1,
    slug: input.slug,
    title: input.title,
    visible_columns: vis,
    default_group_key: defaultGroupKey,
    show_org_on_public: true,
    visible_question_columns: ui.visible_question_columns,
    visible_answer_columns: ui.visible_answer_columns,
    visible_document_columns: ui.visible_document_columns,
    term_field_settings: ui.term_field_settings,
    data,
    created_at: now,
    updated_at: now,
  };
  await persistBlob(body);
}

function validateSubset(keys: string[] | undefined, allowed: Set<string>): string[] {
  if (!keys) return [];
  return keys.filter((k) => allowed.has(k));
}

export async function updatePublication(
  slug: string,
  patch: {
    title?: string;
    visibleColumnKeys?: string[];
    defaultGroupKey?: string;
    showOrgOnPublic?: boolean;
    visibleQuestionColumns?: string[];
    visibleAnswerColumns?: string[];
    visibleDocumentColumns?: string[];
    termFieldSettings?: TermFieldSetting[];
  }
): Promise<PublicationRow | null> {
  const existing = await getPublicationBySlug(slug);
  if (!existing) return null;
  const opts = new Set(existing.data.summaryColumnOptions);
  const title = patch.title ?? existing.title;
  const defaultGroupKey =
    patch.defaultGroupKey !== undefined && patch.defaultGroupKey !== ""
      ? patch.defaultGroupKey
      : existing.default_group_key;
  if (
    patch.defaultGroupKey !== undefined &&
    patch.defaultGroupKey !== "" &&
    !existing.data.groups.some((g) => g.groupKey === patch.defaultGroupKey)
  ) {
    throw new Error("Invalid defaultGroupKey");
  }
  let visible = patch.visibleColumnKeys ?? existing.visible_columns;
  if (patch.visibleColumnKeys) {
    visible = patch.visibleColumnKeys.filter((k) => opts.has(k));
  }
  const showOrgOnPublic =
    patch.showOrgOnPublic !== undefined
      ? patch.showOrgOnPublic
      : existing.show_org_on_public;

  const qOpts = new Set(existing.data.questionColumnOptions);
  const aOpts = new Set(existing.data.answerColumnOptions);
  const dOpts = new Set(existing.data.documentColumnOptions);

  const uiFallback = publicationUiDefaults(existing.data);
  let visible_question_columns = existing.visible_question_columns;
  if (patch.visibleQuestionColumns) {
    visible_question_columns = validateSubset(patch.visibleQuestionColumns, qOpts);
    if (visible_question_columns.length === 0) {
      visible_question_columns = uiFallback.visible_question_columns;
    }
  }
  let visible_answer_columns = existing.visible_answer_columns;
  if (patch.visibleAnswerColumns) {
    visible_answer_columns = validateSubset(patch.visibleAnswerColumns, aOpts);
    if (visible_answer_columns.length === 0) {
      visible_answer_columns = uiFallback.visible_answer_columns;
    }
  }
  let visible_document_columns = existing.visible_document_columns;
  if (patch.visibleDocumentColumns) {
    visible_document_columns = validateSubset(patch.visibleDocumentColumns, dOpts);
    if (visible_document_columns.length === 0) {
      visible_document_columns = uiFallback.visible_document_columns;
    }
  }

  let term_field_settings = existing.term_field_settings;
  if (patch.termFieldSettings) {
    const defaults = publicationUiDefaults(existing.data).term_field_settings;
    const sanitized = patch.termFieldSettings.map((t) => ({
      key: t.key,
      label: String(t.label ?? t.key).slice(0, 200),
      visible: Boolean(t.visible),
    }));
    term_field_settings = mergeTermFieldSettings(sanitized, defaults);
  }

  const now = new Date().toISOString();
  const body: StoredPublicationBlob = {
    version: 1,
    slug: existing.slug,
    title,
    visible_columns: visible,
    default_group_key: defaultGroupKey,
    show_org_on_public: showOrgOnPublic,
    visible_question_columns,
    visible_answer_columns,
    visible_document_columns,
    term_field_settings,
    data: existing.data,
    created_at: existing.created_at,
    updated_at: now,
  };
  await persistBlob(body);
  return getPublicationBySlug(slug);
}

/**
 * Parses a second workbook and merges it into an existing publication (same slug).
 */
export async function mergePublicationFromUpload(
  slug: string,
  buffer: Buffer,
  fileName: string
): Promise<PublicationRow | null> {
  const existing = await getPublicationBySlug(slug);
  if (!existing) return null;
  const parsed = parseCasWorkbook(buffer, fileName);
  const merged = ensurePublicationColumnMetadata(
    mergePublicationData(existing.data, parsed)
  );
  const ui = publicationUiDefaults(merged);
  const summaryOpts = new Set(merged.summaryColumnOptions);
  const summaryKept = existing.visible_columns.filter((k) => summaryOpts.has(k));
  const summaryFallback = defaultVisibleColumns(merged.summaryColumnOptions).filter((k) =>
    summaryOpts.has(k)
  );
  const visible_columns =
    summaryKept.length > 0 ? summaryKept : summaryFallback;
  const visible_question_columns = mergeVisibleDetailKeys(
    existing.visible_question_columns,
    merged.questionColumnOptions,
    ui.visible_question_columns
  );
  const visible_answer_columns = mergeVisibleDetailKeys(
    existing.visible_answer_columns,
    merged.answerColumnOptions,
    ui.visible_answer_columns
  );
  const visible_document_columns = mergeVisibleDetailKeys(
    existing.visible_document_columns,
    merged.documentColumnOptions,
    ui.visible_document_columns
  );
  const term_field_settings = mergeTermFieldSettings(
    existing.term_field_settings,
    ui.term_field_settings
  );
  const default_group_key = merged.groups.some(
    (g) => g.groupKey === existing.default_group_key
  )
    ? existing.default_group_key
    : merged.groups[0]?.groupKey ?? existing.default_group_key;

  const now = new Date().toISOString();
  const body: StoredPublicationBlob = {
    version: 1,
    slug: existing.slug,
    title: existing.title,
    visible_columns:
      visible_columns.length > 0
        ? visible_columns
        : defaultVisibleColumns(merged.summaryColumnOptions),
    default_group_key,
    show_org_on_public: existing.show_org_on_public,
    visible_question_columns,
    visible_answer_columns,
    visible_document_columns,
    term_field_settings,
    data: merged,
    created_at: existing.created_at,
    updated_at: now,
  };
  await persistBlob(body);
  return getPublicationBySlug(slug);
}
