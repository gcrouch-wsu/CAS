"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminHomePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/admin/login");
    router.refresh();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError("Choose an Excel file.");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      if (title.trim()) fd.set("title", title.trim());
      const res = await fetch("/api/admin/publications", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const body = (await res.json()) as { error?: string; slug?: string };
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!res.ok) {
        setError(body.error ?? "Upload failed");
        return;
      }
      if (body.slug) {
        router.push(`/admin/${body.slug}`);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-wsu-gray-dark">
            Publish CAS export
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-wsu-gray">
            Upload a workbook from CAS. Next, you&apos;ll choose summary columns and public
            options before sharing the link.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="shrink-0 text-sm text-wsu-gray underline decoration-wsu-gray/30 hover:text-wsu-crimson"
        >
          Sign out
        </button>
      </div>

      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-wsu-gray/10 bg-white p-6 shadow-sm"
      >
        <div>
          <span className="text-sm font-semibold text-wsu-gray-dark">Excel file</span>
          <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-wsu-gray/25 bg-wsu-cream/50 px-4 py-12 transition hover:border-wsu-crimson/40 hover:bg-wsu-crimson/[0.04]">
            <span className="text-center text-sm text-wsu-gray">
              {file ? (
                <span className="font-medium text-wsu-gray-dark">{file.name}</span>
              ) : (
                <>
                  <span className="font-medium text-wsu-gray-dark">Click to choose a file</span>
                  <span className="mt-1 block text-xs text-wsu-gray">.xlsx from CAS</span>
                </>
              )}
            </span>
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="sr-only"
            />
          </label>
        </div>

        <label className="mt-6 block text-sm font-medium text-wsu-gray-dark">
          Title (optional)
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Engineering CAS — 2026"
            className="mt-1.5 w-full rounded-lg border border-wsu-gray/20 px-3 py-2.5 text-wsu-gray-dark shadow-inner placeholder:text-wsu-gray/50 focus:border-wsu-crimson focus:outline-none focus:ring-2 focus:ring-wsu-crimson/20"
          />
        </label>

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !file}
          className="mt-8 w-full rounded-xl bg-wsu-crimson px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-wsu-crimson/25 ring-2 ring-wsu-crimson/20 transition hover:bg-wsu-crimson-dark hover:ring-wsu-crimson/30 disabled:pointer-events-none disabled:opacity-40"
        >
          {loading ? "Uploading…" : "Upload & continue"}
        </button>
        {!file && (
          <p className="mt-3 text-center text-xs text-wsu-gray">Select a file to enable upload.</p>
        )}
      </form>
    </div>
  );
}
