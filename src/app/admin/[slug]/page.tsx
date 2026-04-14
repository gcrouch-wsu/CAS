"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type ConfigResponse = {
  slug: string;
  title: string;
  visibleColumnKeys: string[];
  defaultGroupKey: string;
  showOrgOnPublic: boolean;
  summaryColumnOptions: string[];
  groupKeys: { key: string; label: string }[];
  sourceFileName: string;
};

function sortedKeysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

export default function AdminPublicationPage() {
  const params = useParams();
  const router = useRouter();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const [saved, setSaved] = useState<ConfigResponse | null>(null);
  const [draftColumns, setDraftColumns] = useState<string[]>([]);
  const [draftDefault, setDraftDefault] = useState("");
  const [draftShowOrg, setDraftShowOrg] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const applyConfig = useCallback((c: ConfigResponse) => {
    setSaved(c);
    setDraftColumns([...c.visibleColumnKeys]);
    setDraftDefault(c.defaultGroupKey);
    setDraftShowOrg(c.showOrgOnPublic);
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
    const body = await res.json();
    if (!res.ok) {
      setError((body as { error?: string }).error ?? "Failed to load");
      setSaved(null);
      setLoading(false);
      return;
    }
    applyConfig(body as ConfigResponse);
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
      draftShowOrg !== saved.showOrgOnPublic
    );
  }, [saved, draftColumns, draftDefault, draftShowOrg]);

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
        }),
      });
      if (res.status === 401) {
        router.push(`/admin/login?next=${encodeURIComponent(`/admin/${slug}`)}`);
        return;
      }
      const body = await res.json();
      if (!res.ok) {
        setError((body as { error?: string }).error ?? "Save failed");
        return;
      }
      applyConfig({
        ...saved,
        visibleColumnKeys: body.visibleColumnKeys,
        defaultGroupKey: body.defaultGroupKey,
        showOrgOnPublic: Boolean(body.showOrgOnPublic),
      });
      setSaveMessage("Saved. Public page now uses these settings.");
      window.setTimeout(() => setSaveMessage(null), 5000);
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  function discard() {
    if (!saved) return;
    setDraftColumns([...saved.visibleColumnKeys]);
    setDraftDefault(saved.defaultGroupKey);
    setDraftShowOrg(saved.showOrgOnPublic);
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
              Source file
            </h2>
            <p className="mt-2 text-sm text-wsu-gray-dark">{saved.sourceFileName}</p>
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
              Checked columns appear in the public summary for each program. Term-specific
              dates always show under &quot;Application windows&quot;. Use{" "}
              <strong className="text-wsu-gray-dark">Save changes</strong> below to update
              the live public page.
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
