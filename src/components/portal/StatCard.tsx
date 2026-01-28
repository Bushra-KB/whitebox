import type { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string;
  trend?: string;
  icon?: ReactNode;
}

export default function StatCard({ title, value, trend, icon }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
          {trend ? <p className="mt-1 text-xs text-emerald-600">{trend}</p> : null}
        </div>
        {icon ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}
