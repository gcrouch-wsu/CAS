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

  const showOrg =
    initial.showOrgContent &&
    (initial.orgQuestions.length > 0 || initial.orgAnswers.length > 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-10 rounded-xl border border-wsu-gray/10 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-wsu-crimson">
          Program view
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-wsu-gray-dark">
          {initial.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-wsu-gray">
          Search or select a degree or certificate to review requirements and materials from
          the published CAS export.
        </p>
      </header>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1 text-sm font-medium text-wsu-gray-dark">
          Search
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Program name…"
            className="mt-1.5 w-full rounded-lg border border-wsu-gray/20 bg-white px-3 py-2.5 text-base text-wsu-gray-dark shadow-sm placeholder:text-wsu-gray/60 focus:border-wsu-crimson focus:outline-none focus:ring-2 focus:ring-wsu-crimson/25"
          />
        </label>
        <label className="min-w-[min(100%,280px)] flex-1 text-sm font-medium text-wsu-gray-dark">
          Program
          <select
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-wsu-gray/20 bg-white px-3 py-2.5 text-base text-wsu-gray-dark shadow-sm focus:border-wsu-crimson focus:outline-none focus:ring-2 focus:ring-wsu-crimson/25"
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
        <p className="rounded-lg border border-wsu-gray/15 bg-white px-4 py-6 text-wsu-gray">
          No programs match that search.
        </p>
      ) : selected ? (
        <ProgramDetail group={selected} />
      ) : null}

      {showOrg && (
        <section className="mt-14 rounded-xl border border-wsu-gray/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-wsu-gray-dark">Organization (shared)</h2>
          <p className="mt-2 text-sm leading-relaxed text-wsu-gray">
            These rows come from the Org Questions / Org Answers sheets and apply by cycle
            and organization, not by individual program.
          </p>
          {initial.orgQuestions.length > 0 && (
            <details className="mt-5 rounded-lg border border-wsu-gray/10 bg-wsu-cream/60 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-wsu-gray-dark">
                Org questions ({initial.orgQuestions.length})
              </summary>
              <TableFromRecords rows={initial.orgQuestions} />
            </details>
          )}
          {initial.orgAnswers.length > 0 && (
            <details className="mt-4 rounded-lg border border-wsu-gray/10 bg-wsu-cream/60 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-wsu-gray-dark">
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

function sectionTitle(text: string) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-widest text-wsu-crimson">
      {text}
    </h3>
  );
}

function ProgramDetail({ group }: { group: PublicProgramGroup }) {
  return (
    <article className="space-y-10 rounded-xl border border-wsu-gray/10 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-2xl font-semibold text-wsu-gray-dark">{group.displayName}</h2>
        <p className="mt-1 font-mono text-xs text-wsu-gray">Group: {group.groupKey}</p>
      </div>

      {Object.keys(group.visibleShared).length > 0 && (
        <section className="space-y-3">
          {sectionTitle("Summary")}
          <dl className="grid gap-3 sm:grid-cols-2">
            {Object.entries(group.visibleShared).map(([k, v]) => (
              <div
                key={k}
                className="rounded-lg border border-wsu-gray/10 bg-wsu-cream/40 px-3 py-3"
              >
                <dt className="text-xs font-medium text-wsu-gray">{k}</dt>
                <dd className="mt-1 text-sm text-wsu-gray-dark">{v || "—"}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {group.offerings.length > 0 && (
        <section className="space-y-3">
          {sectionTitle("Application windows")}
          <ul className="space-y-2 text-sm text-wsu-gray-dark">
            {group.offerings.map((o) => (
              <li
                key={o.programId}
                className="flex flex-wrap items-baseline gap-x-2 rounded-lg border border-wsu-gray/10 bg-wsu-cream/30 px-3 py-2"
              >
                <span className="font-medium">{o.termLine}</span>
                <span className="text-xs text-wsu-gray">Program ID: {o.programId}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        {sectionTitle("Recommendations")}
        {group.recommendationNote && (
          <p className="rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {group.recommendationNote}
          </p>
        )}
        {group.recommendations && Object.keys(group.recommendations).length > 0 ? (
          <dl className="grid gap-3 sm:grid-cols-2">
            {Object.entries(group.recommendations).map(([k, v]) => (
              <div key={k} className="rounded-lg border border-wsu-gray/10 px-3 py-2">
                <dt className="text-xs font-medium text-wsu-gray">{k}</dt>
                <dd className="mt-1 text-sm text-wsu-gray-dark">{v || "—"}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-wsu-gray">None in export for these programs.</p>
        )}
      </section>

      <section className="space-y-3">
        {sectionTitle("Program questions")}
        {group.questions.length ? (
          <TableFromRecords rows={group.questions} />
        ) : (
          <p className="text-sm text-wsu-gray">None in export.</p>
        )}
      </section>

      <section className="space-y-3">
        {sectionTitle("Answers")}
        {group.answers.length ? (
          <TableFromRecords rows={group.answers} />
        ) : (
          <p className="text-sm text-wsu-gray">None in export.</p>
        )}
      </section>

      <section className="space-y-3">
        {sectionTitle("Documents")}
        {group.documents.length ? (
          <TableFromRecords rows={group.documents} />
        ) : (
          <p className="text-sm text-wsu-gray">None in export.</p>
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
    <div className="mt-3 overflow-x-auto rounded-lg border border-wsu-gray/15">
      <table className="min-w-full divide-y divide-wsu-gray/10 text-left text-sm">
        <thead className="bg-wsu-crimson/10 text-xs font-semibold uppercase tracking-wide text-wsu-gray-dark">
          <tr>
            {keys.map((k) => (
              <th key={k} className="whitespace-nowrap px-3 py-2.5">
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-wsu-gray/10 bg-white">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-wsu-cream/40">
              {keys.map((k) => (
                <td key={k} className="max-w-xs whitespace-pre-wrap px-3 py-2.5 text-wsu-gray-dark">
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
