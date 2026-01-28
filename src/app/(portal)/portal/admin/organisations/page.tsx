"use client";

import { useEffect, useMemo, useState } from "react";
import SectionCard from "@/components/portal/SectionCard";
import { adminInvoke } from "@/lib/adminApi";

type OrgRow = {
  organization_id: number;
  name: string;
  organization_type: string | null;
  country: string | null;
  city: string | null;
  website: string | null;
  is_claimed: boolean;
  created_at: string | null;
  user_count: number;
  report_count: number;
};

const orgTypeOptions = ["company", "supplier", "ngo", "regulatory"];

export default function AdminOrganisationsPage() {
  const [rows, setRows] = useState<OrgRow[]>([]);
  const [typeFilter, setTypeFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    adminInvoke<{ organisations: OrgRow[] }>("listOrganisations")
      .then((data) => {
        if (!isMounted) return;
        setRows(data.organisations);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unable to load organisations.");
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredRows = useMemo(() => {
    if (!typeFilter) return rows;
    return rows.filter((row) => row.organization_type === typeFilter);
  }, [rows, typeFilter]);

  const updateOrganisation = async (id: number, updates: Record<string, unknown>) => {
    setIsSaving(true);
    setError(null);
    try {
      await adminInvoke("updateOrganisation", { organization_id: id, ...updates });
      setRows((prev) =>
        prev.map((row) => (row.organization_id === id ? { ...row, ...updates } : row))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update organisation.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SectionCard
      title="Organisations"
      description={`${filteredRows.length} results`}
      actions={
        <div className="flex items-center gap-2">
          <select className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600">
            <option>Sort</option>
            <option>Name</option>
          </select>
          <select
            className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="">Filter</option>
            {orgTypeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      }
    >
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.2em] text-slate-400">
            <tr>
              <th className="px-4 py-3">No</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Users</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Creation Date</th>
              <th className="px-4 py-3">Number of Reports</th>
              <th className="px-4 py-3">Website</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, index) => (
              <tr key={row.organization_id} className="border-t border-slate-100">
                <td className="px-4 py-3">{index + 1}</td>
                <td className="px-4 py-3 font-semibold text-slate-800">{row.name}</td>
                <td className="px-4 py-3">{row.user_count}</td>
                <td className="px-4 py-3">
                  <select
                    className="rounded-full border border-slate-200 px-2 py-1 text-[11px]"
                    value={row.organization_type || ""}
                    disabled={isSaving}
                    onChange={(event) =>
                      updateOrganisation(row.organization_id, {
                        organization_type: event.target.value || null,
                      })
                    }
                  >
                    <option value="">-</option>
                    {orgTypeOptions.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  {row.created_at ? new Date(row.created_at).toLocaleDateString() : "-"}
                </td>
                <td className="px-4 py-3">{row.report_count}</td>
                <td className="px-4 py-3 text-[var(--wb-cobalt)]">
                  {row.website || "-"}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 px-2 py-1 text-[11px]"
                    disabled={isSaving}
                    onClick={() =>
                      updateOrganisation(row.organization_id, { is_claimed: !row.is_claimed })
                    }
                  >
                    {row.is_claimed ? "Active" : "Awaiting"}
                  </button>
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
  );
}
