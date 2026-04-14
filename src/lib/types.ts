/** Parsed CAS workbook stored as JSON (Postgres JSONB). */

export interface CasOffering {
  programId: string;
  /** Human-readable line for this application window (term + dates). */
  termLine: string;
  /** Columns that differ within the program group (raw values). */
  varying: Record<string, string>;
}

export interface CasProgramGroup {
  groupKey: string;
  displayName: string;
  /** Fields identical for every Program Attributes row in this group. */
  shared: Record<string, string>;
  offerings: CasOffering[];
  recommendations: Record<string, string> | null;
  recommendationNote?: string;
  questions: Record<string, string>[];
  documents: Record<string, string>[];
  answers: Record<string, string>[];
}

export interface CasPublicationData {
  sourceFileName: string;
  orgQuestions: Record<string, string>[];
  orgAnswers: Record<string, string>[];
  groups: CasProgramGroup[];
  /** Union of keys suitable for the summary strip (shared fields across groups). */
  summaryColumnOptions: string[];
}

export interface PublicPublicationPayload {
  title: string;
  slug: string;
  defaultGroupKey: string;
  visibleColumnKeys: string[];
  orgQuestions: Record<string, string>[];
  orgAnswers: Record<string, string>[];
  groups: PublicProgramGroup[];
}

export interface PublicProgramGroup {
  groupKey: string;
  displayName: string;
  visibleShared: Record<string, string>;
  offerings: CasOffering[];
  recommendations: Record<string, string> | null;
  recommendationNote?: string;
  questions: Record<string, string>[];
  documents: Record<string, string>[];
  answers: Record<string, string>[];
}
