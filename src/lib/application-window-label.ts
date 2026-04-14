import type { CasOffering, TermFieldSetting } from "./types";
import { cleanProgramId } from "./parse-cas";

/** Bold line segments from “In title” term fields (same logic as public application-window cards). */
export function applicationWindowHeadingText(
  o: CasOffering,
  settings: TermFieldSetting[]
): string | null {
  const partMap = new Map(o.termParts.map((p) => [p.key, p.value]));
  const segs: string[] = [];
  for (const s of settings) {
    if (!s.show_in_heading) continue;
    const v = partMap.get(s.key)?.trim();
    if (v) segs.push(v);
  }
  return segs.length > 0 ? segs.join(" · ") : null;
}

const FALLBACK_TERM_KEYS = [
  "Start Term",
  "Start Year",
  "Open Date",
  "Application Deadline",
  "Deadline",
  "Updated Date",
] as const;

/** When nothing is “In title”, still show term-like fields so Fall/Spring are visible. */
export function applicationWindowFallbackFromTermParts(o: CasOffering): string | null {
  const map = new Map(o.termParts.map((p) => [p.key, p.value]));
  const segs: string[] = [];
  for (const k of FALLBACK_TERM_KEYS) {
    const v = map.get(k)?.trim();
    if (v) segs.push(v);
  }
  if (segs.length > 0) return segs.join(" · ");
  for (const p of o.termParts) {
    if (p.key === "__summary") continue;
    const v = p.value?.trim();
    if (v) return v;
  }
  const summary = map.get("__summary")?.trim();
  if (summary) return summary;
  return null;
}

/** Full title for a card or table row. */
export function applicationWindowCardTitle(
  o: CasOffering,
  settings: TermFieldSetting[]
): string {
  const fromHeading = applicationWindowHeadingText(o, settings);
  if (fromHeading) return fromHeading;
  const fromParts = applicationWindowFallbackFromTermParts(o);
  if (fromParts) return fromParts;
  const fromLine = o.termLine.trim();
  if (fromLine) return fromLine;
  const pid = cleanProgramId(o.programId);
  if (pid) return `Program ID ${pid}`;
  return "—";
}

/** Prepended on Questions / Answers / Documents so each row shows Fall vs Spring (etc.) first. */
export const APPLICATION_WINDOW_COLUMN = "Application window";

function stripConflictingRowKeys(r: Record<string, string>): Record<string, string> {
  const out = { ...r };
  const kill = APPLICATION_WINDOW_COLUMN.toLowerCase();
  for (const k of Object.keys(out)) {
    if (k.toLowerCase() === kill) delete out[k];
  }
  return out;
}

export function augmentDetailRowsWithApplicationWindow(
  rows: Record<string, string>[],
  offerings: CasOffering[],
  settings: TermFieldSetting[]
): Record<string, string>[] {
  const byPid = new Map<string, CasOffering>();
  for (const o of offerings) {
    byPid.set(cleanProgramId(o.programId), o);
  }
  return rows.map((r) => {
    const base = stripConflictingRowKeys(r);
    const pid = cleanProgramId(base["Program ID"] || "");
    const o = pid ? byPid.get(pid) : undefined;
    const label = o ? applicationWindowCardTitle(o, settings) : "—";
    return { [APPLICATION_WINDOW_COLUMN]: label, ...base };
  });
}

export function prependApplicationWindowColumn(columns: string[]): string[] {
  const rest = columns.filter((c) => c !== APPLICATION_WINDOW_COLUMN);
  return [APPLICATION_WINDOW_COLUMN, ...rest];
}
