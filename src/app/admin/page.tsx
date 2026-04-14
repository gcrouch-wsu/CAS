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
      <div className="mb-6 flex justify-end">
        <button
          type="button"
          onClick={() => void logout()}
          className="text-sm text-zinc-600 underline hover:text-zinc-900"
        >
          Sign out
        </button>
      </div>
      <h1 className="text-2xl font-semibold text-zinc-900">Publish CAS export</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Choose your CAS workbook, then use the green button to upload and continue to
        column settings.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-6">
        <div>
          <span className="block text-sm font-semibold text-zinc-800">Excel file</span>
          <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 transition hover:border-emerald-400 hover:bg-emerald-50/50">
            <span className="text-center text-sm text-zinc-600">
              {file ? (
                <span className="font-medium text-zinc-900">{file.name}</span>
              ) : (
                <>
                  <span className="font-medium text-zinc-800">Click to choose a file</span>
                  <span className="mt-1 block text-xs text-zinc-500">.xlsx from CAS</span>
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

        <label className="block text-sm font-medium text-zinc-700">
          Title (optional)
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Engineering CAS — 2026"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm"
          />
        </label>

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !file}
          className="w-full rounded-xl bg-emerald-600 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-emerald-900/20 ring-2 ring-emerald-500/30 transition hover:bg-emerald-500 hover:ring-emerald-400/50 disabled:pointer-events-none disabled:opacity-40"
        >
          {loading ? "Uploading…" : "Upload & continue"}
        </button>
        {!file && (
          <p className="text-center text-xs text-zinc-500">Select a file above to enable upload.</p>
        )}
      </form>
    </div>
  );
}
