import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--wb-navy)]">
            WhiteBox
          </div>
          <p className="mt-4 max-w-sm text-sm text-slate-600">
            A secure grievance mechanism for supply-chain incidents and ethical concerns,
            designed for transparency, accountability, and protection.
          </p>
        </div>
        <div className="space-y-2 text-sm text-slate-600">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Support
          </div>
          <Link href="/policies" className="block hover:text-slate-900">
            Policies
          </Link>
          <Link href="/guides" className="block hover:text-slate-900">
            Guides
          </Link>
          <Link href="/contact" className="block hover:text-slate-900">
            Contact
          </Link>
        </div>
        <div className="space-y-2 text-sm text-slate-600">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Platform
          </div>
          <Link href="/portal" className="block hover:text-slate-900">
            Organisation portal
          </Link>
          <Link href="/report/new" className="block hover:text-slate-900">
            New report
          </Link>
        </div>
      </div>
    </footer>
  );
}
