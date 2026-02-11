"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const iconClass = "h-4 w-4 text-slate-400";

const icon = (path: string) => (
  <svg viewBox="0 0 24 24" fill="none" className={iconClass} aria-hidden="true">
    <path d={path} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const nav = [
  { label: "Home", href: "/portal/admin", icon: icon("M4 11.5L12 5l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.5Z") },
  { label: "Users", href: "/portal/admin/users", icon: icon("M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm7 8a7 7 0 0 0-14 0") },
  { label: "Reports", href: "/portal/admin/reports", icon: icon("M7 4h7l4 4v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z") },
  { label: "Organisations", href: "/portal/admin/organisations", icon: icon("M4 20h16M6 20V6a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v14M9 10h2M9 14h2M13 10h2M13 14h2") },
  { label: "Risks", href: "/portal/admin/risks", icon: icon("M12 3 2 21h20L12 3Zm0 6v5m0 4h.01") },
  { label: "Contracts", href: "/portal/admin/contracts", icon: icon("M4 7h16M4 12h10M4 17h7") },
  { label: "Relationships", href: "/portal/admin/relationships", icon: icon("M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm10 14a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-4-8 4-4M7 8l4 4") },
  { label: "Archive", href: "/portal/admin/archive", icon: icon("M4 7h16v4H4V7Zm2 6h12v7H6v-7Z") },
  { label: "Spam", href: "/portal/admin/spam", icon: icon("M6 7h12M9 7V5a3 3 0 0 1 6 0v2M7 7l1 13h8l1-13") },
  { label: "Policies", href: "/portal/admin/policies", icon: icon("M6 4h8l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z") },
  { label: "Intake Form", href: "/portal/admin/intake-form", icon: icon("M6 4h12M6 10h12M6 16h8M4 4h.01M4 10h.01M4 16h.01") },
  { label: "Security", href: "/portal/admin/security", icon: icon("M12 3 5 6v6c0 4.5 3.1 8.4 7 9 3.9-.6 7-4.5 7-9V6l-7-3Z") },
  { label: "Audio", href: "/portal/admin/audio", icon: icon("M5 9v6h4l5 4V5l-5 4H5Z") },
  {
    label: "Countries & Languages",
    href: "/portal/admin/languages",
    icon: icon("M12 3v18m9-9H3m3-6h.01M6 18h.01M18 6h.01M18 18h.01"),
  },
  { label: "Consent Control", href: "/portal/admin/consent-control", icon: icon("M12 6v6l4 2") },
  { label: "Feedbacks", href: "/portal/admin/feedbacks", icon: icon("M7 10h10M7 14h6M5 19l2-2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v10Z") },
  { label: "Settings", href: "/portal/admin/settings", icon: icon("M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm7.4 4a7.4 7.4 0 0 0-.1-1l2.1-1.6-2-3.4-2.5 1a7.5 7.5 0 0 0-1.7-1l-.3-2.7H9l-.3 2.7a7.5 7.5 0 0 0-1.7 1l-2.5-1-2 3.4L4.6 11a7.4 7.4 0 0 0-.1 1c0 .3 0 .7.1 1l-2.1 1.6 2 3.4 2.5-1a7.5 7.5 0 0 0 1.7 1l.3 2.7h6l.3-2.7a7.5 7.5 0 0 0 1.7-1l2.5 1 2-3.4-2.1-1.6c.1-.3.1-.7.1-1Z") },
];
                                                    
export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-64 flex-col gap-6 border-r border-slate-100 bg-white px-4 pb-6 pt-6">
      <div className="flex items-center gap-3 px-2">
        <Image src="/logo.png" alt="WhiteBox" width={36} height={36} />
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Admin</p>
          <p className="text-sm font-semibold text-slate-900">System Console</p>
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                active
                  ? "bg-[var(--wb-navy)] text-white"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500">
        <p className="font-semibold text-slate-700">Admin tip</p>
        <p className="mt-1">Review spam and out-of-scope reports daily to keep queues clean.</p>
      </div>
    </aside>
  );
}
