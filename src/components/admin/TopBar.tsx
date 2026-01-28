"use client";

import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const titleMap: Record<string, string> = {
  "/portal/admin": "Dashboard",
  "/portal/admin/users": "Users",
  "/portal/admin/reports": "Reports",
  "/portal/admin/organisations": "Organisations",
  "/portal/admin/risks": "Risks",
  "/portal/admin/contracts": "Contracts",
  "/portal/admin/relationships": "Supply Chains",
  "/portal/admin/archive": "Archive",
  "/portal/admin/spam": "Spam",
  "/portal/admin/policies": "Policies",
  "/portal/admin/security": "Security",
  "/portal/admin/audio": "Audio",
  "/portal/admin/languages": "Countries & Languages",
  "/portal/admin/consent-control": "Consent Control",
  "/portal/admin/feedbacks": "Feedbacks",
  "/portal/admin/settings": "Settings",
};

const resolveTitle = (pathname: string) => {
  const exact = titleMap[pathname];
  if (exact) return exact;
  const segments = pathname.split("/").filter(Boolean);
  return segments[segments.length - 1]?.replace(/-/g, " ") ?? "Admin";
};

export default function AdminTopBar() {
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
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">WhiteBox System Admin</p>
        <h1 className="font-display text-2xl text-slate-900">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600 sm:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
          Platform healthy
        </div>
        <button className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
          🔔
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
            SA
          </span>
          <div>
            <p className="text-[11px] font-semibold text-slate-700">System Admin</p>
            <p className="text-[10px] text-slate-400">Superuser</p>
          </div>
        </div>
      </div>
    </header>
  );
}
