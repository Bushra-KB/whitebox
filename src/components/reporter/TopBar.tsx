"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const titleMap: Record<string, string> = {
  "/portal/reporter": "Dashboard",
  "/portal/reporter/reports": "Reports",
  "/portal/reporter/account/profile": "Profile",
  "/portal/reporter/account/security": "Security",
  "/portal/reporter/account/notifications": "Notifications",
  "/portal/reporter/account/consent": "Consent & Policy",
};

const resolveTitle = (pathname: string) => {
  const exact = titleMap[pathname];
  if (exact) return exact;
  const segments = pathname.split("/").filter(Boolean);
  return segments[segments.length - 1]?.replace(/-/g, " ") ?? "Portal";
};

export default function ReporterTopBar() {
  const pathname = usePathname();
  const title = resolveTitle(pathname);
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/90 px-8 py-4 backdrop-blur">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">WhiteBox Reporter</p>
        <h1 className="font-display text-2xl text-slate-900">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/report/new"
          className="rounded-full bg-[var(--wb-cobalt)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
        >
          New Report
        </Link>
        <button
          type="button"
          className="relative rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm"
        >
          <span className="sr-only">Notifications</span>
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500"></span>
          <span className="text-lg">🔔</span>
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm"
        >
          Log out
        </button>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
          <span className="h-7 w-7 rounded-full bg-slate-100 text-center text-xs font-semibold leading-7 text-slate-600">
            AS
          </span>
          <div className="text-left">
            <p className="text-[11px] font-semibold text-slate-700">Anonymous</p>
            <p className="text-[10px] text-slate-400">Reporter</p>
          </div>
        </div>
      </div>
    </header>
  );
}
