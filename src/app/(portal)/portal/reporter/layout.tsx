import type { ReactNode } from "react";
import ReporterSidebar from "@/components/reporter/Sidebar";
import ReporterTopBar from "@/components/reporter/TopBar";

export default function ReporterLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[var(--wb-porcelain)]">
      <ReporterSidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <ReporterTopBar />
        <main className="flex-1 px-8 pb-16 pt-8">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
