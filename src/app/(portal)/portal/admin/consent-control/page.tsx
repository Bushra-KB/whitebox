"use client";

import { useEffect, useState } from "react";
import SectionCard from "@/components/portal/SectionCard";
import StatCard from "@/components/portal/StatCard";
import { adminInvoke } from "@/lib/adminApi";

type PolicyRow = {
  policy_id: number;
  policy_type: "global" | "organization";
  organization_id: number | null;
  version: number;
  title: string;
  is_active: boolean | null;
  created_at: string | null;
};

export default function AdminConsentControlPage() {
  const [stats, setStats] = useState({ total: 0, active: 0, revoked: 0 });
  const [rows, setRows] = useState<PolicyRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      adminInvoke<{ total: number; active: number; revoked: number }>("consentStats"),
      adminInvoke<{ policies: PolicyRow[] }>("listPolicies"),
    ])
      .then(([statsData, policyData]) => {
        if (!isMounted) return;
        setStats(statsData);
        setRows(policyData.policies);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unable to load consent data.");
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { title: "Total consents", value: stats.total.toString(), trend: "All recorded" },
          { title: "Up to date", value: stats.active.toString(), trend: "Active consent" },
          { title: "Pending review", value: "0", trend: "Manual review" },
          { title: "Revoked", value: stats.revoked.toString(), trend: "Revoked consents" },
        ].map((item) => (
          <StatCard key={item.title} title={item.title} value={item.value} trend={item.trend} />
        ))}
      </div>

      <SectionCard
        title="Consent control"
        description="Manage consent status, expiration, and audit coverage across organisations."
        actions={
          <div className="flex items-center gap-2">
            <select className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600">
              <option>Scope</option>
              <option value="global">Platform</option>
              <option value="organization">Organisation</option>
            </select>
            <select className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600">
              <option>Status</option>
              <option>Active</option>
              <option>Review</option>
            </select>
          </div>
        }
      >
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.2em] text-slate-400">
              <tr>
                <th className="px-4 py-3">Policy</th>
                <th className="px-4 py-3">Scope</th>
                <th className="px-4 py-3">Version</th>
                <th className="px-4 py-3">Last updated</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.policy_id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-semibold text-slate-900">{row.title}</td>
                  <td className="px-4 py-3">
                    {row.policy_type === "global" ? "Platform" : "Organisation"}
                  </td>
                  <td className="px-4 py-3">v{row.version}</td>
                  <td className="px-4 py-3">
                    {row.created_at ? new Date(row.created_at).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                        row.is_active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {row.is_active ? "Active" : "Review"}
                    </span>
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
