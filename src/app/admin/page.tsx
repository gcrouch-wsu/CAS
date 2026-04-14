"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const STORAGE_KEY = "cas_admin_secret";

export default function AdminHomePage() {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError("Choose an Excel file.");
      return;
    }
    if (!secret.trim()) {
      setError("Enter the admin secret.");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      if (title.trim()) fd.set("title", title.trim());
      const res = await fetch("/api/admin/publications", {
        method: "POST",
        headers: { Authorization: `Bearer ${secret.trim()}` },
        body: fd,
      });
      const body = (await res.json()) as { error?: string; slug?: string; adminUrl?: string };
      if (!res.ok) {
        setError(body.error ?? "Upload failed");
        return;
      }
      if (typeof window !== "undefined") {
        sessionStorage.setItem(STORAGE_KEY, secret.trim());
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
      <h1 className="text-2xl font-semibold text-zinc-900">Publish CAS export</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Upload a CAS workbook (.xlsx). You will set which summary columns are public on
        the next screen.
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block text-sm font-medium text-zinc-700">
          Admin secret
          <input
            type="password"
            autoComplete="off"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm"
          />
        </label>
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
        <label className="block text-sm font-medium text-zinc-700">
          Excel file
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-sm text-zinc-600"
          />
        </label>
        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? "Uploading…" : "Upload and continue"}
        </button>
      </form>
    </div>
  );
}
