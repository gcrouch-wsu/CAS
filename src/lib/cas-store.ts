import { query } from "./db";
import type {
  CasPublicationData,
  PublicPublicationPayload,
  PublicProgramGroup,
} from "./types";
import { defaultVisibleColumns, pickVisibleShared } from "./parse-cas";

type StoredGroup = CasPublicationData["groups"][number];

export type PublicationRow = {
  id: string;
  slug: string;
  title: string;
  visible_columns: string[];
  default_group_key: string;
  data: CasPublicationData;
  created_at: string;
  updated_at: string;
};

function mapToPublicGroup(
  g: StoredGroup,
  visibleColumnKeys: string[]
): PublicProgramGroup {
  return {
    groupKey: g.groupKey,
    displayName: g.displayName,
    visibleShared: pickVisibleShared(g.shared, visibleColumnKeys),
    offerings: g.offerings,
    recommendations: g.recommendations,
    recommendationNote: g.recommendationNote,
    questions: g.questions,
    documents: g.documents,
    answers: g.answers,
  };
}

export function toPublicPayload(row: PublicationRow): PublicPublicationPayload {
  const data = row.data;
  const keys = row.visible_columns ?? [];
  return {
    title: row.title,
    slug: row.slug,
    defaultGroupKey: row.default_group_key || data.groups[0]?.groupKey || "",
    visibleColumnKeys: keys,
    orgQuestions: data.orgQuestions,
    orgAnswers: data.orgAnswers,
    groups: data.groups.map((g) => mapToPublicGroup(g, keys)),
  };
}

export async function getPublicationBySlug(
  slug: string
): Promise<PublicationRow | null> {
  const { rows } = await query<PublicationRow>(
    `SELECT id, slug, title, visible_columns, default_group_key, data, created_at, updated_at
     FROM cas_publications WHERE slug = $1`,
    [slug]
  );
  return rows[0] ?? null;
}

export async function createPublication(input: {
  slug: string;
  title: string;
  data: CasPublicationData;
}): Promise<void> {
  const vis = defaultVisibleColumns(input.data.summaryColumnOptions);
  const defaultGroupKey = input.data.groups[0]?.groupKey ?? "";
  await query(
    `INSERT INTO cas_publications (slug, title, visible_columns, default_group_key, data)
     VALUES ($1, $2, $3::text[], $4, $5::jsonb)`,
    [
      input.slug,
      input.title,
      vis,
      defaultGroupKey,
      JSON.stringify(input.data),
    ]
  );
}

export async function updatePublication(
  slug: string,
  patch: {
    title?: string;
    visibleColumnKeys?: string[];
    defaultGroupKey?: string;
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
  await query(
    `UPDATE cas_publications
     SET title = $2,
         visible_columns = $3::text[],
         default_group_key = $4,
         updated_at = now()
     WHERE slug = $1`,
    [slug, title, visible, defaultGroupKey]
  );
  return getPublicationBySlug(slug);
}
