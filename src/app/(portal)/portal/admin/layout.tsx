import type { ReactNode } from "react";
import AdminSidebar from "@/components/admin/Sidebar";
import AdminTopBar from "@/components/admin/TopBar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[var(--wb-porcelain)]">
      <AdminSidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <AdminTopBar />
        <main className="flex-1 px-8 pb-16 pt-8">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
