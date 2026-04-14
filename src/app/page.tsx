import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col justify-center px-6 py-16 text-zinc-900">
      <h1 className="text-3xl font-semibold tracking-tight">CAS program viewer</h1>
      <p className="mt-4 text-zinc-600">
        Publish a CAS Excel export to a read-only page with search and program selection.
        Admin uses a username and password; public pages need only the link.
      </p>
      <nav className="mt-10 flex flex-col gap-3 text-sm font-medium">
        <Link
          href="/admin"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-3 text-center text-zinc-900 shadow-sm hover:bg-zinc-50"
        >
          Admin — upload CAS workbook
        </Link>
        <p className="text-xs text-zinc-500">
          After publishing, open the public URL from the admin screen or use{" "}
          <code className="rounded bg-zinc-100 px-1">/s/&lt;slug&gt;</code>.
        </p>
      </nav>
      <p className="mt-12 text-xs text-zinc-400">
        Source repository:{" "}
        <a
          href="https://github.com/gcrouch-wsu/CAS"
          className="text-zinc-500 underline hover:text-zinc-700"
        >
          github.com/gcrouch-wsu/CAS
        </a>
      </p>
    </div>
  );
}
