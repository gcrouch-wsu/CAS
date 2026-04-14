import * as XLSX from "xlsx";
import type { CasOffering, CasProgramGroup, CasPublicationData } from "./types";

function cellToString(v: unknown): string {
  if (v == null || v === "") return "";
  if (v instanceof Date) {
    const m = v.getUTCMonth() + 1;
    const d = v.getUTCDate();
    const y = String(v.getUTCFullYear()).slice(-2);
    return `${m}/${d}/${y}`;
  }
  return String(v).trim();
}

function normalizeRow(r: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(r)) {
    out[k.trim()] = cellToString(v);
  }
  return out;
}

function readSheet(
  wb: XLSX.WorkBook,
  name: string
): Record<string, string>[] {
  const sheet = wb.Sheets[name];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });
  return rows.map(normalizeRow);
}

function cleanProgramId(pid: string): string {
  return pid.trim();
}

function groupKey(row: Record<string, string>): string {
  const w = (row["WebAdMIT Label"] || "").trim();
  if (w) return `webadmit:${w}`;
  const code = (row["ProgramCode"] || row["Program Code"] || "").trim();
  if (code) return `code:${code}`;
  const uid = (row["Unique ID"] || "").trim();
  if (uid) return `uid:${uid}`;
  const prog = (row["Program"] || "").trim();
  const org = (row["Organization"] || "").trim();
  const cycle = (row["Cycle"] || "").trim();
  return `fallback:${org}|${prog}|${cycle}`;
}

const TERMISH = new Set(
  [
    "Start Term",
    "Start Year",
    "Open Date",
    "Deadline",
    "Application Deadline",
    "Updated Date",
  ].map((s) => s.toLowerCase())
);

function isTermishColumn(name: string): boolean {
  const l = name.toLowerCase();
  if (TERMISH.has(l)) return true;
  if (l.includes("deadline")) return true;
  if (l.includes("open date")) return true;
  return false;
}

function buildTermLine(row: Record<string, string>): string {
  const st = row["Start Term"] || "";
  const sy = row["Start Year"] || "";
  const head = [st, sy].filter(Boolean).join(" ").trim();
  const open = row["Open Date"] || "";
  const app = row["Application Deadline"] || "";
  const close = row["Deadline"] || "";
  const parts: string[] = [];
  if (head) parts.push(head);
  const tail: string[] = [];
  if (open) tail.push(`open: ${open}`);
  if (app) tail.push(`application deadline: ${app}`);
  if (close) tail.push(`close: ${close}`);
  if (tail.length) parts.push(tail.join(", "));
  return parts.join(" — ") || "Offering";
}

function computeShared(rows: Record<string, string>[]): Record<string, string> {
  if (rows.length === 0) return {};
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  const shared: Record<string, string> = {};
  for (const k of keys) {
    const vals = rows.map((r) => r[k] ?? "");
    const first = vals[0];
    if (vals.every((v) => v === first)) {
      shared[k] = first;
    }
  }
  return shared;
}

function computeVarying(row: Record<string, string>, shared: Record<string, string>): Record<string, string> {
  const varying: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    if (!(k in shared) || shared[k] !== v) {
      varying[k] = v;
    }
  }
  return varying;
}

function mergeRecs(
  pa: Record<string, string>[],
  recRows: Record<string, string>[]
): Map<string, Record<string, string>> {
  const map = new Map<string, Record<string, string>>();
  for (const r of recRows) {
    const pid = cleanProgramId(r["Program ID"] || "");
    if (!pid) continue;
    map.set(pid, {
      "Evaluation Type": r["Evaluation Type"] || "",
      Max: r["Max"] || "",
      Min: r["Min"] || "",
      "Minimum Required for Application to be submitted for review":
        r["Minimum Required for Application to be submitted for review"] || "",
    });
  }
  return map;
}

function rowsForProgram(
  rows: Record<string, string>[],
  programId: string
): Record<string, string>[] {
  const pid = cleanProgramId(programId);
  return rows.filter((r) => cleanProgramId(r["Program ID"] || "") === pid);
}

function dedupeQuestions(rows: Record<string, string>[]): Record<string, string>[] {
  const seen = new Set<string>();
  const out: Record<string, string>[] = [];
  for (const r of rows) {
    const k = `${r["Question Block"] || ""}|${r["Question"] || ""}|${r["Question Type"] || ""}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

function dedupeDocuments(rows: Record<string, string>[]): Record<string, string>[] {
  const seen = new Set<string>();
  const out: Record<string, string>[] = [];
  for (const r of rows) {
    const k = `${r["Document Type"] || ""}|${r["Application Instructions"] || ""}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

function dedupeAnswers(rows: Record<string, string>[]): Record<string, string>[] {
  const seen = new Set<string>();
  const out: Record<string, string>[] = [];
  for (const r of rows) {
    const k = r["Answer Value"] || JSON.stringify(r);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

function pickDisplayName(rows: Record<string, string>[]): string {
  const r = rows[0];
  return (
    (r["Program"] || "").trim() ||
    (r["WebAdMIT Label"] || "").trim() ||
    (r["ProgramCode"] || r["Program Code"] || "").trim() ||
    "Program"
  );
}

function mergeRecommendationForGroup(
  programIds: string[],
  recMap: Map<string, Record<string, string>>
): { rec: Record<string, string> | null; note?: string } {
  const payloads = programIds
    .map((id) => recMap.get(id))
    .filter((x): x is Record<string, string> => !!x && Object.values(x).some(Boolean));
  if (payloads.length === 0) return { rec: null };
  const canon = JSON.stringify(payloads[0]);
  const allSame = payloads.every((p) => JSON.stringify(p) === canon);
  if (allSame) return { rec: payloads[0] };
  return {
    rec: payloads[0],
    note: "Recommendation settings differ between application windows in this group; showing one window’s values. Confirm in CAS.",
  };
}

function defaultHideSummaryKey(k: string): boolean {
  const l = k.toLowerCase();
  if (l === "program id") return true;
  if (l === "unique id") return true;
  if (l.includes("internal")) return true;
  return false;
}

export function parseCasWorkbook(buffer: Buffer, sourceFileName: string): CasPublicationData {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });

  const pa = readSheet(wb, "Program Attributes").filter((r) => cleanProgramId(r["Program ID"] || ""));
  const recRows = readSheet(wb, "Recommendations");
  const recMap = mergeRecs(pa, recRows);
  const questionsAll = readSheet(wb, "Questions").filter((r) => cleanProgramId(r["Program ID"] || ""));
  const documentsAll = readSheet(wb, "Documents").filter((r) => cleanProgramId(r["Program ID"] || ""));
  const answersAll = readSheet(wb, "Answers").filter((r) => cleanProgramId(r["Program ID"] || ""));
  const orgQuestions = readSheet(wb, "Org Questions");
  const orgAnswers = readSheet(wb, "Org Answers");

  const byGroup = new Map<string, Record<string, string>[]>();
  for (const row of pa) {
    const g = groupKey(row);
    const list = byGroup.get(g) ?? [];
    list.push(row);
    byGroup.set(g, list);
  }

  const groups: CasProgramGroup[] = [];
  for (const [, rows] of byGroup) {
    const shared = computeShared(rows);
    const offerings: CasOffering[] = rows.map((row) => {
      const pid = cleanProgramId(row["Program ID"] || "");
      const varying = computeVarying(row, shared);
      return {
        programId: pid,
        termLine: buildTermLine(row),
        varying,
      };
    });

    const programIds = rows.map((r) => cleanProgramId(r["Program ID"] || ""));
    const qAccum: Record<string, string>[] = [];
    const dAccum: Record<string, string>[] = [];
    const aAccum: Record<string, string>[] = [];
    for (const pid of programIds) {
      qAccum.push(...rowsForProgram(questionsAll, pid));
      dAccum.push(...rowsForProgram(documentsAll, pid));
      aAccum.push(...rowsForProgram(answersAll, pid));
    }

    const { rec, note } = mergeRecommendationForGroup(programIds, recMap);

    groups.push({
      groupKey: groupKey(rows[0]),
      displayName: pickDisplayName(rows),
      shared,
      offerings,
      recommendations: rec,
      recommendationNote: note,
      questions: dedupeQuestions(qAccum),
      documents: dedupeDocuments(dAccum),
      answers: dedupeAnswers(aAccum),
    });
  }

  groups.sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" }));

  const summaryColumnOptionsSet = new Set<string>();
  for (const g of groups) {
    for (const [k, v] of Object.entries(g.shared)) {
      if (!v && k !== "Program") continue;
      if (!isTermishColumn(k)) summaryColumnOptionsSet.add(k);
    }
  }
  const summaryColumnOptions = [...summaryColumnOptionsSet].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );

  return {
    sourceFileName,
    orgQuestions,
    orgAnswers,
    groups,
    summaryColumnOptions,
  };
}

export function defaultVisibleColumns(options: string[]): string[] {
  return options.filter((k) => !defaultHideSummaryKey(k));
}

export function pickVisibleShared(
  shared: Record<string, string>,
  visibleColumnKeys: string[]
): Record<string, string> {
  const keys =
    visibleColumnKeys.length > 0
      ? visibleColumnKeys
      : Object.keys(shared).filter((k) => !defaultHideSummaryKey(k));
  const out: Record<string, string> = {};
  for (const k of keys) {
    if (k in shared) out[k] = shared[k];
  }
  return out;
}
