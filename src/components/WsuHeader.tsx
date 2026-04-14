import Link from "next/link";

export function WsuHeader() {
  return (
    <header className="border-b border-wsu-crimson-dark/20 bg-wsu-crimson text-white shadow-md">
      <div className="mx-auto flex max-w-6xl flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        <div>
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-white hover:text-white/90"
          >
            CAS program viewer
          </Link>
          <p className="text-xs font-medium uppercase tracking-widest text-white/70">
            Washington State University
          </p>
        </div>
      </div>
    </header>
  );
}
