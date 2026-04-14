"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminHomePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [files, setFiles] = useState<File[]>([]);
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
    if (files.length === 0) {
      setError("Choose at least one Excel file.");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      for (const f of files) {
        fd.append("files", f);
      }
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
            Upload one workbook, or select <strong className="font-semibold text-wsu-gray-dark">EngineeringCAS and GradCAS together</strong> in one step (they are merged into one publication). Then choose summary columns and share the link.
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
          <span className="text-sm font-semibold text-wsu-gray-dark">
            CAS Excel workbooks (.xlsx)
          </span>
          <p className="mt-1 text-xs leading-relaxed text-wsu-gray">
            <strong className="text-wsu-gray-dark">Same-time upload:</strong> click below, then in the file dialog select both exports — hold{" "}
            <kbd className="rounded border border-wsu-gray/25 bg-wsu-cream px-1 font-mono text-[10px] text-wsu-gray-dark">
              Ctrl
            </kbd>{" "}
            (Windows) or{" "}
            <kbd className="rounded border border-wsu-gray/25 bg-wsu-cream px-1 font-mono text-[10px] text-wsu-gray-dark">
              Cmd
            </kbd>{" "}
            (Mac) while clicking each file. Order is kept as you pick them (first file wins when merge settings conflict).
          </p>
          <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-wsu-gray/25 bg-wsu-cream/50 px-4 py-12 transition hover:border-wsu-crimson/40 hover:bg-wsu-crimson/[0.04]">
            <span className="text-center text-sm text-wsu-gray">
              {files.length > 0 ? (
                <span className="block max-w-full">
                  <span className="font-medium text-wsu-gray-dark">
                    {files.length} file{files.length === 1 ? "" : "s"} selected
                  </span>
                  <ul className="mt-2 max-h-32 list-inside list-disc overflow-y-auto text-left text-xs text-wsu-gray-dark">
                    {files.map((f) => (
                      <li key={`${f.name}-${f.size}`} className="truncate">
                        {f.name}
                      </li>
                    ))}
                  </ul>
                </span>
              ) : (
                <>
                  <span className="font-medium text-wsu-gray-dark">Click to choose file(s)</span>
                  <span className="mt-1 block text-xs text-wsu-gray">
                    One file, or multiple .xlsx (e.g. EngineeringCAS + GradCAS)
                  </span>
                </>
              )}
            </span>
            <input
              type="file"
              multiple
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              className="sr-only"
            />
          </label>
          {files.length > 0 && (
            <button
              type="button"
              className="mt-2 text-xs font-medium text-wsu-crimson underline decoration-wsu-crimson/30 hover:decoration-wsu-crimson"
              onClick={() => setFiles([])}
            >
              Clear selection
            </button>
          )}
        </div>

        <label className="mt-6 block text-sm font-medium text-wsu-gray-dark">
          Title (optional)
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Engineering & Graduate CAS — 2026"
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
          disabled={loading || files.length === 0}
          className="mt-8 w-full rounded-xl bg-wsu-crimson px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-wsu-crimson/25 ring-2 ring-wsu-crimson/20 transition hover:bg-wsu-crimson-dark hover:ring-wsu-crimson/30 disabled:pointer-events-none disabled:opacity-40"
        >
          {loading ? "Uploading…" : files.length > 1 ? "Upload merged workbooks" : "Upload & continue"}
        </button>
        {files.length === 0 && (
          <p className="mt-3 text-center text-xs text-wsu-gray">Select at least one file to enable upload.</p>
        )}
      </form>
    </div>
  );
}
