"use client";

import { upload } from "@vercel/blob/client";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { TermFieldSetting } from "@/lib/types";

type ConfigResponse = {
  slug: string;
  title: string;
  visibleColumnKeys: string[];
  defaultGroupKey: string;
  showOrgOnPublic: boolean;
  summaryColumnOptions: string[];
  questionColumnOptions: string[];
  answerColumnOptions: string[];
  documentColumnOptions: string[];
  visibleQuestionColumns: string[];
  visibleAnswerColumns: string[];
  visibleDocumentColumns: string[];
  termFieldSettings: TermFieldSetting[];
  showProgramIdOnPublic: boolean;
  groupKeys: { key: string; label: string }[];
  sourceFileName: string;
};

function sortedKeysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

function termPayloadEqual(a: TermFieldSetting[], b: TermFieldSetting[]): boolean {
  const norm = (x: TermFieldSetting[]) =>
    [...x]
      .sort((p, q) => p.key.localeCompare(q.key))
      .map((t) => ({
        key: t.key,
        label: t.label,
        visible: t.visible,
        show_in_heading: t.show_in_heading === true,
      }));
  return JSON.stringify(norm(a)) === JSON.stringify(norm(b));
}

export default function AdminPublicationPage() {
  const params = useParams();
  const router = useRouter();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const [saved, setSaved] = useState<ConfigResponse | null>(null);
  const [draftColumns, setDraftColumns] = useState<string[]>([]);
  const [draftDefault, setDraftDefault] = useState("");
  const [draftShowOrg, setDraftShowOrg] = useState(true);
  const [draftQuestionCols, setDraftQuestionCols] = useState<string[]>([]);
  const [draftAnswerCols, setDraftAnswerCols] = useState<string[]>([]);
  const [draftDocumentCols, setDraftDocumentCols] = useState<string[]>([]);
  const [draftTermSettings, setDraftTermSettings] = useState<TermFieldSetting[]>([]);
  const [draftShowProgramId, setDraftShowProgramId] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mergeFile, setMergeFile] = useState<File | null>(null);
  const [mergeBusy, setMergeBusy] = useState(false);
  const [mergeMessage, setMergeMessage] = useState<string | null>(null);

  const applyConfig = useCallback((c: ConfigResponse) => {
    setSaved(c);
    setDraftColumns([...c.visibleColumnKeys]);
    setDraftDefault(c.defaultGroupKey);
    setDraftShowOrg(c.showOrgOnPublic);
    setDraftQuestionCols([...c.visibleQuestionColumns]);
    setDraftAnswerCols([...c.visibleAnswerColumns]);
    setDraftDocumentCols([...c.visibleDocumentColumns]);
    setDraftTermSettings(c.termFieldSettings.map((t) => ({ ...t })));
    setDraftShowProgramId(c.showProgramIdOnPublic);
  }, []);

  const loadConfig = useCallback(async () => {
    if (!slug) return;
    setError(null);
    setSaveMessage(null);
    const res = await fetch(`/api/admin/publications/${slug}`, { credentials: "include" });
    if (res.status === 401) {
      router.push(`/admin/login?next=${encodeURIComponent(`/admin/${slug}`)}`);
      return;
    }
    const raw = await res.text();
    let body: Record<string, unknown> = {};
    try {
      if (raw.trim()) body = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      setError(`Failed to load settings (HTTP ${res.status}). ${raw.slice(0, 300)}`);
      setSaved(null);
      setLoading(false);
      return;
    }
    if (!res.ok) {
      setError(typeof body.error === "string" ? body.error : "Failed to load");
      setSaved(null);
      setLoading(false);
      return;
    }
    applyConfig(body as unknown as ConfigResponse);
    setLoading(false);
  }, [slug, router, applyConfig]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const dirty = useMemo(() => {
    if (!saved) return false;
    return (
      !sortedKeysEqual(draftColumns, saved.visibleColumnKeys) ||
      draftDefault !== saved.defaultGroupKey ||
      draftShowOrg !== saved.showOrgOnPublic ||
      !sortedKeysEqual(draftQuestionCols, saved.visibleQuestionColumns) ||
      !sortedKeysEqual(draftAnswerCols, saved.visibleAnswerColumns) ||
      !sortedKeysEqual(draftDocumentCols, saved.visibleDocumentColumns) ||
      !termPayloadEqual(draftTermSettings, saved.termFieldSettings) ||
      draftShowProgramId !== saved.showProgramIdOnPublic
    );
  }, [
    saved,
    draftColumns,
    draftDefault,
    draftShowOrg,
    draftQuestionCols,
    draftAnswerCols,
    draftDocumentCols,
    draftTermSettings,
    draftShowProgramId,
  ]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/admin/login");
    router.refresh();
  }

  async function saveAll() {
    if (!saved) return;
    setSaving(true);
    setError(null);
    setSaveMessage(null);
    try {
      const res = await fetch(`/api/admin/publications/${slug}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visibleColumnKeys: draftColumns,
          defaultGroupKey: draftDefault,
          showOrgOnPublic: draftShowOrg,
          showProgramIdOnPublic: draftShowProgramId,
          visibleQuestionColumns: draftQuestionCols,
          visibleAnswerColumns: draftAnswerCols,
          visibleDocumentColumns: draftDocumentCols,
          termFieldSettings: draftTermSettings,
        }),
      });
      if (res.status === 401) {
        router.push(`/admin/login?next=${encodeURIComponent(`/admin/${slug}`)}`);
        return;
      }
      const rawSave = await res.text();
      let body: Partial<ConfigResponse> & { error?: string } = {};
      try {
        if (rawSave.trim()) body = JSON.parse(rawSave) as typeof body;
      } catch {
        setError(`Save failed (HTTP ${res.status}). ${rawSave.slice(0, 300)}`);
        return;
      }
      if (!res.ok) {
        setError(body.error ?? "Save failed");
        return;
      }
      applyConfig({
        ...saved,
        visibleColumnKeys: body.visibleColumnKeys ?? saved.visibleColumnKeys,
        defaultGroupKey: body.defaultGroupKey ?? saved.defaultGroupKey,
        showOrgOnPublic:
          body.showOrgOnPublic !== undefined ? Boolean(body.showOrgOnPublic) : saved.showOrgOnPublic,
        visibleQuestionColumns: body.visibleQuestionColumns ?? saved.visibleQuestionColumns,
        visibleAnswerColumns: body.visibleAnswerColumns ?? saved.visibleAnswerColumns,
        visibleDocumentColumns: body.visibleDocumentColumns ?? saved.visibleDocumentColumns,
        termFieldSettings: body.termFieldSettings ?? saved.termFieldSettings,
        showProgramIdOnPublic:
          body.showProgramIdOnPublic !== undefined
            ? Boolean(body.showProgramIdOnPublic)
            : saved.showProgramIdOnPublic,
      });
      setSaveMessage("Saved. Public page now uses these settings.");
      window.setTimeout(() => setSaveMessage(null), 5000);
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function mergeUpload() {
    if (!mergeFile) {
      setMergeMessage("Choose a workbook to merge.");
      return;
    }
    setMergeBusy(true);
    setMergeMessage(null);
    setError(null);
    try {
      const pathname = `cas-merge-staging/${slug}/${crypto.randomUUID()}.xlsx`;
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      let blobResult;
      try {
        blobResult = await upload(pathname, mergeFile, {
          access: "private",
          handleUploadUrl: `${origin}/api/admin/merge-workbook-token`,
          clientPayload: JSON.stringify({ slug }),
          multipart: mergeFile.size > 4 * 1024 * 1024,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Direct upload failed";
        setError(
          `${msg} Large workbooks are sent straight to Blob storage (not through the small server upload limit). Try again, or sign out and back in.`
        );
        return;
      }

      const res = await fetch(`/api/admin/publications/${slug}/merge`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pathname: blobResult.pathname,
          sourceFileName: mergeFile.name,
        }),
      });
      const rawMerge = await res.text();
      let body: { error?: string; sourceFileName?: string } = {};
      try {
        if (rawMerge.trim()) body = JSON.parse(rawMerge) as typeof body;
      } catch {
        setError(`Merge failed (HTTP ${res.status}). ${rawMerge.slice(0, 400)}`);
        return;
      }
      if (res.status === 401) {
        router.push(`/admin/login?next=${encodeURIComponent(`/admin/${slug}`)}`);
        return;
      }
      if (!res.ok) {
        setError(body.error ?? "Merge failed");
        return;
      }
      setMergeFile(null);
      setMergeMessage(
        body.sourceFileName
          ? `Merged. Combined source label: ${body.sourceFileName}`
          : "Merged successfully."
      );
      await loadConfig();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error during merge");
    } finally {
      setMergeBusy(false);
    }
  }

  function discard() {
    if (!saved) return;
    setDraftColumns([...saved.visibleColumnKeys]);
    setDraftDefault(saved.defaultGroupKey);
    setDraftShowOrg(saved.showOrgOnPublic);
    setDraftQuestionCols([...saved.visibleQuestionColumns]);
    setDraftAnswerCols([...saved.visibleAnswerColumns]);
    setDraftDocumentCols([...saved.visibleDocumentColumns]);
    setDraftTermSettings(saved.termFieldSettings.map((t) => ({ ...t })));
    setDraftShowProgramId(saved.showProgramIdOnPublic);
    setSaveMessage(null);
  }

  function toggleColumn(key: string) {
    setDraftColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return [...next];
    });
  }

  function toggleDetailColumn(setter: React.Dispatch<React.SetStateAction<string[]>>, key: string) {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return [...next];
    });
  }

  function setTermLabel(key: string, label: string) {
    setDraftTermSettings((prev) =>
      prev.map((t) => (t.key === key ? { ...t, label } : t))
    );
  }

  function setTermVisible(key: string, visible: boolean) {
    setDraftTermSettings((prev) =>
      prev.map((t) => (t.key === key ? { ...t, visible } : t))
    );
  }

  function setTermHeading(key: string, show_in_heading: boolean) {
    setDraftTermSettings((prev) =>
      prev.map((t) => (t.key === key ? { ...t, show_in_heading } : t))
    );
  }

  const publicPath = `/s/${slug}`;

  if (!slug) {
    return <p className="p-6 text-sm text-wsu-gray">Invalid publication.</p>;
  }

  if (loading && !saved) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-wsu-gray">
        Loading publication…
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-3xl px-4 pb-28 pt-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-wsu-gray/15 pb-6">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="rounded-md px-2 py-1 text-wsu-gray hover:bg-wsu-crimson/5 hover:text-wsu-crimson"
          >
            ← New upload
          </button>
          <span className="text-wsu-gray/40">|</span>
          <a
            href={publicPath}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md px-2 py-1 font-medium text-wsu-crimson hover:bg-wsu-crimson/5"
          >
            Open public page ↗
          </a>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="text-sm text-wsu-gray underline decoration-wsu-gray/30 hover:text-wsu-crimson"
        >
          Sign out
        </button>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight text-wsu-gray-dark">
        Publication settings
      </h1>
      <p className="mt-1 font-mono text-xs text-wsu-gray">slug: {slug}</p>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {saveMessage && (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {saveMessage}
        </p>
      )}

      {saved && (
        <div className="mt-8 space-y-10">
          <section className="rounded-xl border border-wsu-gray/15 bg-white p-5 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-wsu-gray">
              Source file(s)
            </h2>
            <p className="mt-2 text-sm text-wsu-gray-dark">{saved.sourceFileName}</p>
            <p className="mt-3 text-sm text-wsu-gray">
              Add another CAS export (for example GradCAS after EngineeringCAS). The app reads your
              second file and combines it with what is already published — you keep separate
              workbooks; nothing is pre-merged in Excel. Large files upload straight to Blob storage
              so they are not limited by the small server request cap on Vercel.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="block flex-1 text-sm font-medium text-wsu-gray-dark">
                Second workbook (.xlsx)
                <input
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  disabled={mergeBusy}
                  onChange={(e) => setMergeFile(e.target.files?.[0] ?? null)}
                  className="mt-1.5 block w-full text-sm text-wsu-gray-dark file:mr-3 file:rounded-md file:border-0 file:bg-wsu-crimson/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-wsu-crimson hover:file:bg-wsu-crimson/20"
                />
              </label>
              <button
                type="button"
                disabled={mergeBusy || !mergeFile}
                onClick={() => void mergeUpload()}
                className="rounded-lg bg-wsu-gray-dark px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-wsu-gray disabled:opacity-50"
              >
                {mergeBusy ? "Uploading and merging…" : "Add workbook to publication"}
              </button>
            </div>
            {mergeMessage && (
              <p className="mt-3 text-sm text-emerald-800">{mergeMessage}</p>
            )}
          </section>

          <section className="rounded-xl border border-wsu-gray/15 bg-white p-5 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-wsu-gray">
              Default program
            </h2>
            <p className="mt-2 text-sm text-wsu-gray">
              Shown first when someone opens the public link (they can still switch programs).
            </p>
            <select
              value={draftDefault}
              disabled={saving}
              onChange={(e) => setDraftDefault(e.target.value)}
              className="mt-3 w-full max-w-xl rounded-lg border border-wsu-gray/25 bg-wsu-cream px-3 py-2.5 text-sm text-wsu-gray-dark shadow-inner focus:border-wsu-crimson focus:outline-none focus:ring-1 focus:ring-wsu-crimson"
            >
              {saved.groupKeys.map((g) => (
                <option key={g.key} value={g.key}>
                  {g.label}
                </option>
              ))}
            </select>
          </section>

          <section className="rounded-xl border border-wsu-gray/15 bg-white p-5 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-wsu-gray">
              Organization content on public page
            </h2>
            <p className="mt-2 text-sm text-wsu-gray">
              Org Questions and Org Answers are shared across programs. Turn off if you do
              not want them visible on the public link.
            </p>
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-wsu-gray/15 bg-wsu-cream/80 px-4 py-3">
              <input
                type="checkbox"
                checked={draftShowOrg}
                disabled={saving}
                onChange={(e) => setDraftShowOrg(e.target.checked)}
                className="mt-1 size-4 rounded border-wsu-gray text-wsu-crimson focus:ring-wsu-crimson"
              />
              <span>
                <span className="font-medium text-wsu-gray-dark">
                  Show organization questions &amp; answers
                </span>
                <span className="mt-0.5 block text-xs text-wsu-gray">
                  Uncheck to hide org-level CAS sheets from the public view only (data stays
                  in the export).
                </span>
              </span>
            </label>
          </section>

          <section className="rounded-xl border border-wsu-gray/15 bg-white p-5 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-wsu-gray">
              Summary columns (public)
            </h2>
            <p className="mt-2 text-sm text-wsu-gray">
              Checked columns appear in the public summary for each program. Application-window
              dates are controlled separately below. Use{" "}
              <strong className="text-wsu-gray-dark">Save changes</strong> to update the live
              public page.
            </p>
            <ul className="mt-4 max-h-[28rem] space-y-1 overflow-y-auto rounded-lg border border-wsu-gray/10 bg-wsu-cream/50 p-3">
              {saved.summaryColumnOptions.map((key, idx) => (
                <li
                  key={key}
                  className="flex items-start gap-3 rounded-md px-2 py-2 hover:bg-white/80"
                >
                  <input
                    id={`col-${idx}`}
                    type="checkbox"
                    checked={draftColumns.includes(key)}
                    disabled={saving}
                    onChange={() => toggleColumn(key)}
                    className="mt-0.5 size-4 rounded border-wsu-gray text-wsu-crimson focus:ring-wsu-crimson"
                  />
                  <label htmlFor={`col-${idx}`} className="cursor-pointer text-sm text-wsu-gray-dark">
                    {key}
                  </label>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-wsu-gray/15 bg-white p-5 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-wsu-gray">
              Application window lines (public)
            </h2>
            <p className="mt-2 text-sm text-wsu-gray">
              Check “In title” for each CAS column that should form the friendly line at the top of
              an application window (for example Start Term, then Start Year — order follows this
              list). “In bullets” controls the detailed list under that line. You can relabel any
              row (for example “CAS import” instead of “Open Date”).
            </p>
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-wsu-gray/15 bg-wsu-cream/60 px-4 py-3">
              <input
                type="checkbox"
                checked={draftShowProgramId}
                disabled={saving}
                onChange={(e) => setDraftShowProgramId(e.target.checked)}
                className="mt-1 size-4 rounded border-wsu-gray text-wsu-crimson focus:ring-wsu-crimson"
              />
              <span className="text-sm text-wsu-gray-dark">
                Show CAS Program ID on the public page (off by default; use only if readers need
                the internal ID).
              </span>
            </label>
            <ul className="mt-4 space-y-3">
              {draftTermSettings.map((t) => (
                <li
                  key={t.key}
                  className="rounded-lg border border-wsu-gray/15 bg-wsu-cream/40 p-3"
                >
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-wsu-gray-dark">
                      <input
                        type="checkbox"
                        checked={t.visible}
                        disabled={saving}
                        onChange={(e) => setTermVisible(t.key, e.target.checked)}
                        className="size-4 rounded border-wsu-gray text-wsu-crimson focus:ring-wsu-crimson"
                      />
                      In bullets
                    </label>
                    <label className="flex items-center gap-2 text-sm text-wsu-gray-dark">
                      <input
                        type="checkbox"
                        checked={t.show_in_heading === true}
                        disabled={saving}
                        onChange={(e) => setTermHeading(t.key, e.target.checked)}
                        className="size-4 rounded border-wsu-gray text-wsu-crimson focus:ring-wsu-crimson"
                      />
                      In title
                    </label>
                    <span className="text-xs font-mono text-wsu-gray">({t.key})</span>
                  </div>
                  <label className="mt-2 block text-xs font-medium text-wsu-gray">
                    Public label
                    <input
                      type="text"
                      value={t.label}
                      disabled={saving}
                      onChange={(e) => setTermLabel(t.key, e.target.value)}
                      className="mt-1 w-full rounded-md border border-wsu-gray/20 bg-white px-2 py-1.5 text-sm text-wsu-gray-dark focus:border-wsu-crimson focus:outline-none focus:ring-1 focus:ring-wsu-crimson"
                    />
                  </label>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-wsu-gray/15 bg-white p-5 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-wsu-gray">
              Program questions table (public columns)
            </h2>
            <p className="mt-2 text-sm text-wsu-gray">
              Cycle, Organization, Program, and Program ID are hidden by default because they
              repeat the summary. Turn them on if you need them in this table.
            </p>
            <ul className="mt-4 max-h-[22rem] space-y-1 overflow-y-auto rounded-lg border border-wsu-gray/10 bg-wsu-cream/50 p-3">
              {saved.questionColumnOptions.map((key, idx) => (
                <li
                  key={key}
                  className="flex items-start gap-3 rounded-md px-2 py-2 hover:bg-white/80"
                >
                  <input
                    id={`qcol-${idx}`}
                    type="checkbox"
                    checked={draftQuestionCols.includes(key)}
                    disabled={saving}
                    onChange={() => toggleDetailColumn(setDraftQuestionCols, key)}
                    className="mt-0.5 size-4 rounded border-wsu-gray text-wsu-crimson focus:ring-wsu-crimson"
                  />
                  <label htmlFor={`qcol-${idx}`} className="cursor-pointer text-sm text-wsu-gray-dark">
                    {key}
                  </label>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-wsu-gray/15 bg-white p-5 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-wsu-gray">
              Answers table (public columns)
            </h2>
            <ul className="mt-4 max-h-[22rem] space-y-1 overflow-y-auto rounded-lg border border-wsu-gray/10 bg-wsu-cream/50 p-3">
              {saved.answerColumnOptions.map((key, idx) => (
                <li
                  key={key}
                  className="flex items-start gap-3 rounded-md px-2 py-2 hover:bg-white/80"
                >
                  <input
                    id={`acol-${idx}`}
                    type="checkbox"
                    checked={draftAnswerCols.includes(key)}
                    disabled={saving}
                    onChange={() => toggleDetailColumn(setDraftAnswerCols, key)}
                    className="mt-0.5 size-4 rounded border-wsu-gray text-wsu-crimson focus:ring-wsu-crimson"
                  />
                  <label htmlFor={`acol-${idx}`} className="cursor-pointer text-sm text-wsu-gray-dark">
                    {key}
                  </label>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-wsu-gray/15 bg-white p-5 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-wsu-gray">
              Documents table (public columns)
            </h2>
            <ul className="mt-4 max-h-[22rem] space-y-1 overflow-y-auto rounded-lg border border-wsu-gray/10 bg-wsu-cream/50 p-3">
              {saved.documentColumnOptions.map((key, idx) => (
                <li
                  key={key}
                  className="flex items-start gap-3 rounded-md px-2 py-2 hover:bg-white/80"
                >
                  <input
                    id={`dcol-${idx}`}
                    type="checkbox"
                    checked={draftDocumentCols.includes(key)}
                    disabled={saving}
                    onChange={() => toggleDetailColumn(setDraftDocumentCols, key)}
                    className="mt-0.5 size-4 rounded border-wsu-gray text-wsu-crimson focus:ring-wsu-crimson"
                  />
                  <label htmlFor={`dcol-${idx}`} className="cursor-pointer text-sm text-wsu-gray-dark">
                    {key}
                  </label>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-wsu-gray/20 bg-white/95 px-4 py-4 shadow-[0_-8px_32px_rgba(0,0,0,0.12)] backdrop-blur-sm">
          <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-wsu-gray-dark">
              You have unsaved changes. Save to update the{" "}
              <strong className="text-wsu-crimson">public</strong> view.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={discard}
                disabled={saving}
                className="rounded-lg border border-wsu-gray/30 bg-white px-4 py-2.5 text-sm font-medium text-wsu-gray-dark hover:bg-wsu-cream disabled:opacity-50"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={() => void saveAll()}
                disabled={saving}
                className="rounded-lg bg-wsu-crimson px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-wsu-crimson-dark disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
