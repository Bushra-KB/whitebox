"use client";

import { useEffect, useMemo, useState } from "react";
import SectionCard from "@/components/portal/SectionCard";
import { adminInvoke } from "@/lib/adminApi";

type ContractRow = {
  relationship_id: number;
  parent_org_id: number;
  child_org_id: number;
  relationship_type_id: number;
  purchase_volume: number | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  is_active: boolean | null;
  created_at: string | null;
};

type OrgRow = {
  organization_id: number;
  name: string;
};

export default function AdminContractsPage() {
  const [rows, setRows] = useState<ContractRow[]>([]);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      adminInvoke<{ relationships: ContractRow[] }>("listRelationships"),
      adminInvoke<{ organisations: OrgRow[] }>("listOrganisations"),
    ])
      .then(([relData, orgData]) => {
        if (!isMounted) return;
        setRows(relData.relationships);
        setOrgs(orgData.organisations);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unable to load contracts.");
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const orgNameById = useMemo(
    () => Object.fromEntries(orgs.map((org) => [org.organization_id, org.name])),
    [orgs]
  );

  const contractRows = rows.filter((row) => row.contract_start_date || row.contract_end_date);

  return (
    <SectionCard
      title="Contracts"
      description={`${contractRows.length} results`}
      actions={
        <div className="flex items-center gap-2">
          <select className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600">
            <option>Sort</option>
          </select>
          <select className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600">
            <option>Filter</option>
          </select>
        </div>
      }
    >
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.2em] text-slate-400">
            <tr>
              <th className="px-4 py-3">No</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Partner</th>
              <th className="px-4 py-3">Purchase Volume</th>
              <th className="px-4 py-3">Contract Dates</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {contractRows.map((row, index) => (
              <tr key={row.relationship_id} className="border-t border-slate-100">
                <td className="px-4 py-3">{index + 1}</td>
                <td className="px-4 py-3">{orgNameById[row.parent_org_id] || "-"}</td>
                <td className="px-4 py-3">{orgNameById[row.child_org_id] || "-"}</td>
                <td className="px-4 py-3">{row.purchase_volume ?? "-"}</td>
                <td className="px-4 py-3">
                  {row.contract_start_date || "-"} → {row.contract_end_date || "-"}
                </td>
                <td className="px-4 py-3">{row.is_active ? "Active" : "Pending"}</td>
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
