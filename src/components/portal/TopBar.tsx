"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { loadOrgContext } from "@/lib/orgContext";

const titleMap: Record<string, string> = {
  "/portal/org": "Dashboard",
  "/portal/org/reports": "Reports",
  "/portal/org/actions": "Actions",
  "/portal/org/issues": "Issues",
  "/portal/org/account/profile": "Profile",
  "/portal/org/account/security": "Security",
  "/portal/org/account/notifications": "Notifications",
  "/portal/org/account/consent": "Consent & Policy",
  "/portal/org/organisations/profile": "Organisation Profile",
  "/portal/org/organisations/worksites": "Worksites",
  "/portal/org/organisations/policies": "Policies",
  "/portal/org/organisations/departments": "Departments",
  "/portal/org/organisations/triage-workflows": "Triage Workflows",
  "/portal/org/organisations/users": "Users",
  "/portal/org/organisations/add-ons": "Add-Ons",
  "/portal/org/organisations/relationships": "Relationships",
  "/portal/org/organisations/deadlines": "Deadlines",
};

const resolveTitle = (pathname: string) => {
  const exact = titleMap[pathname];
  if (exact) return exact;
  const segments = pathname.split("/").filter(Boolean);
  return segments[segments.length - 1]?.replace(/-/g, " ") ?? "Portal";
};

export default function TopBar() {
  const pathname = usePathname();
  const title = resolveTitle(pathname);
  const router = useRouter();
  const [userName, setUserName] = useState("Loading...");
  const [roleName, setRoleName] = useState("Organisation");
  const [initials, setInitials] = useState("WB");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      try {
        const context = await loadOrgContext();
        if (!isMounted) return;
        const displayName =
          context.profile.displayName ||
          `${context.profile.firstName} ${context.profile.lastName}`.trim() ||
          context.profile.email ||
          "Organisation member";
        const initialsValue = displayName
          .split(" ")
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase())
          .join("");
        setUserName(displayName);
        setRoleName(context.roleName || "Organisation");
        setInitials(initialsValue || "WB");
      } catch {
        if (!isMounted) return;
        setUserName("Organisation member");
        setRoleName("Organisation");
        setInitials("WB");
      }
    };
    loadProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/90 px-8 py-4 backdrop-blur">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">WhiteBox</p>
        <h1 className="font-display text-2xl text-slate-900">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden w-64 items-center sm:flex">
          <input
            type="search"
            placeholder="Search reports, actions, stakeholders"
            className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
          />
          <span className="absolute right-3 text-xs text-slate-400">⌘K</span>
        </div>
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
            {initials}
          </span>
          <div className="text-left">
            <p className="text-[11px] font-semibold text-slate-700">{userName}</p>
            <p className="text-[10px] text-slate-400">{roleName}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
