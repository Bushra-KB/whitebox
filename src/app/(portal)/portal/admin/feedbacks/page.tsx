"use client";

import { useEffect, useMemo, useState } from "react";
import SectionCard from "@/components/portal/SectionCard";
import StatCard from "@/components/portal/StatCard";
import { adminInvoke } from "@/lib/adminApi";

type FeedbackRow = {
  id: number;
  created_at: string;
  rate: number | null;
  recommed_us: boolean | null;
  report_id: number | null;
  report_code: string | null;
};

export default function AdminFeedbacksPage() {
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    adminInvoke<{ feedbacks: FeedbackRow[] }>("listFeedbacks")
      .then((data) => {
        if (!isMounted) return;
        setRows(data.feedbacks);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unable to load feedbacks.");
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const ratings = rows.map((row) => row.rate).filter((rate): rate is number => typeof rate === "number");
    const avg = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : "0";
    return [
      { title: "Avg. rating", value: avg, trend: "Latest submissions" },
      { title: "Responses", value: rows.length.toString(), trend: "Total feedbacks" },
      { title: "Recommends", value: rows.filter((row) => row.recommed_us).length.toString(), trend: "Positive votes" },
      { title: "No rating", value: rows.filter((row) => row.rate === null).length.toString(), trend: "Missing rating" },
    ];
  }, [rows]);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <StatCard key={item.title} title={item.title} value={item.value} trend={item.trend} />
        ))}
      </div>

      <SectionCard
        title="Feedbacks"
        description={`${rows.length} results`}
        actions={
          <div className="flex items-center gap-2">
            <select className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600">
              <option>Sort</option>
              <option>Newest</option>
              <option>Lowest rating</option>
            </select>
            <button className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600">
              Export
            </button>
          </div>
        }
      >
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.2em] text-slate-400">
              <tr>
                <th className="px-4 py-3">Report</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Recommend</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {row.report_code ?? row.report_id ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                      {row.rate ?? "-"} / 5
                    </span>
                  </td>
                  <td className="px-4 py-3">{row.recommed_us ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">
                    {row.created_at ? new Date(row.created_at).toLocaleDateString() : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {error ? (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {error}
          </p>
        ) : null}
      </SectionCard>
    </div>
  );
}
