import type { ReactNode } from "react";
import { PrimaryNav } from "@/components/public/PrimaryNav";
import { PublicFooter } from "@/components/public/PublicFooter";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--wb-porcelain)] text-slate-900">
      <PrimaryNav />
      {children}
      <PublicFooter />
    </div>
  );
}
