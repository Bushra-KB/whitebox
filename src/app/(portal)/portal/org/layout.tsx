import type { ReactNode } from "react";
import Sidebar from "@/components/portal/Sidebar";
import TopBar from "@/components/portal/TopBar";

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[var(--wb-porcelain)]">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <TopBar />
        <main className="flex-1 px-8 pb-16 pt-8">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
