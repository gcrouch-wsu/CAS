"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "cas_admin_secret";

type ConfigResponse = {
  slug: string;
  title: string;
  visibleColumnKeys: string[];
  defaultGroupKey: string;
  summaryColumnOptions: string[];
  groupKeys: { key: string; label: string }[];
  sourceFileName: string;
};

export default function AdminPublicationPage() {
  const params = useParams();
  const router = useRouter();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const [secret, setSecret] = useState("");
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadWithToken = useCallback(
    async (token: string) => {
      if (!slug || !token.trim()) return;
      setError(null);
      const res = await fetch(`/api/admin/publications/${slug}`, {
        headers: { Authorization: `Bearer ${token.trim()}` },
      });
      const body = await res.json();
      if (!res.ok) {
        setError((body as { error?: string }).error ?? "Failed to load");
        setConfig(null);
        return;
      }
      setConfig(body as ConfigResponse);
      setSecret(token.trim());
      sessionStorage.setItem(STORAGE_KEY, token.trim());
    },
    [slug]
  );

  useEffect(() => {
    if (!slug) return;
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      setSecret(stored);
      void loadWithToken(stored);
    }
  }, [slug, loadWithToken]);

  async function save(patch: {
    visibleColumnKeys?: string[];
    defaultGroupKey?: string;
    title?: string;
  }) {
    const s = secret.trim() || sessionStorage.getItem(STORAGE_KEY) || "";
    if (!s) {
      setError("Enter admin secret");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/publications/${slug}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${s}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patch),
      });
      const body = await res.json();
      if (!res.ok) {
        setError((body as { error?: string }).error ?? "Save failed");
        return;
      }
      await loadWithToken(s);
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  function toggleColumn(key: string) {
    if (!config) return;
    const set = new Set(config.visibleColumnKeys);
    if (set.has(key)) set.delete(key);
    else set.add(key);
    void save({ visibleColumnKeys: [...set] });
  }

  if (!slug) {
    return <p className="p-6 text-sm text-zinc-600">Invalid publication.</p>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="text-sm text-zinc-600 underline hover:text-zinc-900"
        >
          ← New upload
        </button>
        <span className="text-zinc-300">|</span>
        <Link href={`/s/${slug}`} className="text-sm font-medium text-emerald-700 underline">
          Open public page
        </Link>
      </div>

      <h1 className="text-2xl font-semibold text-zinc-900">Publication settings</h1>
      <p className="mt-1 font-mono text-xs text-zinc-500">slug: {slug}</p>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <label className="text-sm font-medium text-zinc-700">
          Admin secret
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            className="mt-1 block rounded-md border border-zinc-300 px-3 py-2 shadow-sm"
          />
        </label>
        <button
          type="button"
          onClick={() => void loadWithToken(secret.trim() || sessionStorage.getItem(STORAGE_KEY) || "")}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          Load
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {config && (
        <div className="mt-8 space-y-8">
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Source
            </h2>
            <p className="mt-1 text-sm text-zinc-800">{config.sourceFileName}</p>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Default program (first load)
            </h2>
            <select
              value={config.defaultGroupKey}
              disabled={saving}
              onChange={(e) => void save({ defaultGroupKey: e.target.value })}
              className="mt-2 w-full max-w-xl rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
            >
              {config.groupKeys.map((g) => (
                <option key={g.key} value={g.key}>
                  {g.label}
                </option>
              ))}
            </select>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Summary columns (public)
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Checked columns appear in the public summary for each program. Term-specific
              dates always show under &quot;Application windows&quot;.
            </p>
            <ul className="mt-4 max-h-96 space-y-2 overflow-y-auto rounded-lg border border-zinc-200 p-3">
              {config.summaryColumnOptions.map((key, idx) => (
                <li key={key} className="flex items-start gap-2 text-sm">
                  <input
                    id={`col-${idx}`}
                    type="checkbox"
                    checked={config.visibleColumnKeys.includes(key)}
                    disabled={saving}
                    onChange={() => toggleColumn(key)}
                    className="mt-0.5"
                  />
                  <label htmlFor={`col-${idx}`} className="cursor-pointer text-zinc-800">
                    {key}
                  </label>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
