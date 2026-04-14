"use client";

import { useEffect, useMemo, useState } from "react";
import type { PublicProgramGroup, PublicPublicationPayload } from "@/lib/types";

function pickGroup(
  groups: PublicProgramGroup[],
  key: string
): PublicProgramGroup | undefined {
  return groups.find((g) => g.groupKey === key) ?? groups[0];
}

export default function PublicCasView({
  initial,
}: {
  initial: PublicPublicationPayload;
}) {
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState(
    initial.defaultGroupKey && initial.groups.some((g) => g.groupKey === initial.defaultGroupKey)
      ? initial.defaultGroupKey
      : initial.groups[0]?.groupKey ?? ""
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initial.groups;
    return initial.groups.filter(
      (g) =>
        g.displayName.toLowerCase().includes(q) ||
        g.groupKey.toLowerCase().includes(q)
    );
  }, [initial.groups, query]);

  useEffect(() => {
    if (!filtered.some((g) => g.groupKey === selectedKey)) {
      setSelectedKey(filtered[0]?.groupKey ?? "");
    }
  }, [filtered, selectedKey]);

  const selected = useMemo(
    () => pickGroup(initial.groups, selectedKey),
    [initial.groups, selectedKey]
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 text-zinc-900">
      <header className="mb-8 border-b border-zinc-200 pb-6">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          CAS program view
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
          {initial.title}
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Choose a degree or certificate to see requirements and materials from the
          uploaded CAS export.
        </p>
      </header>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1 text-sm font-medium text-zinc-700">
          Search
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type part of a program name…"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-base shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </label>
        <label className="min-w-[min(100%,280px)] flex-1 text-sm font-medium text-zinc-700">
          Program
          <select
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            size={1}
          >
            {filtered.map((g) => (
              <option key={g.groupKey} value={g.groupKey}>
                {g.displayName}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="text-zinc-600">No programs match that search.</p>
      ) : selected ? (
        <ProgramDetail group={selected} />
      ) : null}

      {(initial.orgQuestions.length > 0 || initial.orgAnswers.length > 0) && (
        <section className="mt-12 border-t border-zinc-200 pt-8">
          <h2 className="text-lg font-semibold text-zinc-900">Organization (shared)</h2>
          <p className="mt-1 text-sm text-zinc-600">
            These rows come from the Org Questions / Org Answers sheets and apply by
            cycle and organization, not by individual program.
          </p>
          {initial.orgQuestions.length > 0 && (
            <details className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <summary className="cursor-pointer font-medium text-zinc-800">
                Org questions ({initial.orgQuestions.length})
              </summary>
              <TableFromRecords rows={initial.orgQuestions} />
            </details>
          )}
          {initial.orgAnswers.length > 0 && (
            <details className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <summary className="cursor-pointer font-medium text-zinc-800">
                Org answers ({initial.orgAnswers.length})
              </summary>
              <TableFromRecords rows={initial.orgAnswers} />
            </details>
          )}
        </section>
      )}
    </div>
  );
}

function ProgramDetail({ group }: { group: PublicProgramGroup }) {
  return (
    <article className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">{group.displayName}</h2>
        <p className="mt-1 text-xs text-zinc-500">Group key: {group.groupKey}</p>
      </div>

      {Object.keys(group.visibleShared).length > 0 && (
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Summary
          </h3>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            {Object.entries(group.visibleShared).map(([k, v]) => (
              <div key={k} className="rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2">
                <dt className="text-xs font-medium text-zinc-500">{k}</dt>
                <dd className="text-sm text-zinc-900">{v || "—"}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {group.offerings.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Application windows
          </h3>
          <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-zinc-800">
            {group.offerings.map((o) => (
              <li key={o.programId}>
                <span className="font-medium">{o.termLine}</span>
                <span className="ml-2 text-zinc-500">(Program ID: {o.programId})</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Recommendations
        </h3>
        {group.recommendationNote && (
          <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {group.recommendationNote}
          </p>
        )}
        {group.recommendations && Object.keys(group.recommendations).length > 0 ? (
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            {Object.entries(group.recommendations).map(([k, v]) => (
              <div key={k} className="rounded-md border border-zinc-100 px-3 py-2">
                <dt className="text-xs font-medium text-zinc-500">{k}</dt>
                <dd className="text-sm text-zinc-900">{v || "—"}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-2 text-sm text-zinc-600">None in export for these programs.</p>
        )}
      </section>

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Program questions
        </h3>
        {group.questions.length ? (
          <TableFromRecords rows={group.questions} />
        ) : (
          <p className="mt-2 text-sm text-zinc-600">None in export.</p>
        )}
      </section>

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Answers
        </h3>
        {group.answers.length ? (
          <TableFromRecords rows={group.answers} />
        ) : (
          <p className="mt-2 text-sm text-zinc-600">None in export.</p>
        )}
      </section>

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Documents
        </h3>
        {group.documents.length ? (
          <TableFromRecords rows={group.documents} />
        ) : (
          <p className="mt-2 text-sm text-zinc-600">None in export.</p>
        )}
      </section>
    </article>
  );
}

function TableFromRecords({ rows }: { rows: Record<string, string>[] }) {
  const keys = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) for (const k of Object.keys(r)) s.add(k);
    return [...s];
  }, [rows]);
  if (keys.length === 0) return null;
  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200">
      <table className="min-w-full divide-y divide-zinc-200 text-left text-sm">
        <thead className="bg-zinc-100 text-xs font-medium uppercase text-zinc-600">
          <tr>
            {keys.map((k) => (
              <th key={k} className="whitespace-nowrap px-3 py-2">
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map((r, i) => (
            <tr key={i} className="bg-white">
              {keys.map((k) => (
                <td key={k} className="max-w-xs whitespace-pre-wrap px-3 py-2 text-zinc-800">
                  {r[k] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
