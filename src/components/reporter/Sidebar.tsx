"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

const iconClass = "h-4 w-4 text-slate-200";

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={iconClass} aria-hidden="true">
    <path
      d="M4 11.5L12 5l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.5Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={iconClass} aria-hidden="true">
    <path
      d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm7 8a7 7 0 0 0-14 0"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className={`h-4 w-4 text-slate-200 transition ${open ? "rotate-180" : ""}`}
    aria-hidden="true"
  >
    <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const navItemClass = (active: boolean) =>
  `flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
    active ? "bg-white/15 text-white" : "text-slate-200 hover:bg-white/10 hover:text-white"
  }`;

const childItemClass = (active: boolean) =>
  `flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] transition ${
    active ? "bg-white/15 text-white" : "text-slate-200/80 hover:bg-white/10 hover:text-white"
  }`;

const portalLinks = [
  { label: "Dashboard", href: "/portal/reporter" },
  { label: "Reports", href: "/portal/reporter/reports" },
];

const accountLinks = [
  { label: "Profile", href: "/portal/reporter/account/profile" },
  { label: "Security", href: "/portal/reporter/account/security" },
  { label: "Notifications", href: "/portal/reporter/account/notifications" },
  { label: "Consent & Policy", href: "/portal/reporter/account/consent" },
];

export default function ReporterSidebar() {
  const pathname = usePathname();
  const [portalOpen, setPortalOpen] = useState(true);
  const [accountOpen, setAccountOpen] = useState(true);

  const activeGroup = useMemo(() => {
    if (pathname.startsWith("/portal/reporter/account")) return "account";
    return "portal";
  }, [pathname]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="flex h-screen w-64 flex-col gap-6 bg-[var(--wb-navy)] px-4 pb-6 pt-7 text-white">
      <div className="flex items-center gap-3 px-2">
        <Image src="/logo.png" alt="WhiteBox" width={36} height={36} />
        <div>
          <p className="text-sm font-semibold tracking-[0.2em]">WHITEBOX</p>
          <p className="text-[11px] text-slate-200/80">Reporter Portal</p>
        </div>
      </div>

      <nav className="flex-1 space-y-4">
        <div className="space-y-2">
          <button
            type="button"
            className={navItemClass(activeGroup === "portal")}
            onClick={() => setPortalOpen((prev) => !prev)}
          >
            <HomeIcon />
            <span className="flex-1">Portal</span>
            <ChevronIcon open={portalOpen} />
          </button>
          {portalOpen && (
            <div className="ml-6 space-y-1">
              {portalLinks.map((item) => (
                <Link key={item.href} href={item.href} className={childItemClass(isActive(item.href))}>
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <button
            type="button"
            className={navItemClass(activeGroup === "account")}
            onClick={() => setAccountOpen((prev) => !prev)}
          >
            <UserIcon />
            <span className="flex-1">Account</span>
            <ChevronIcon open={accountOpen} />
          </button>
          {accountOpen && (
            <div className="ml-6 space-y-1">
              {accountLinks.map((item) => (
                <Link key={item.href} href={item.href} className={childItemClass(isActive(item.href))}>
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-100/80">
        <p className="font-semibold text-white">Need to submit a new report?</p>
        <p className="mt-1 text-[11px]">
          Use your account to file multiple grievances under one secure profile.
        </p>
        <Link
          href="/report/new"
          className="mt-3 inline-flex items-center gap-2 text-[11px] font-semibold text-white"
        >
          Start a report
        </Link>
      </div>
    </aside>
  );
}
