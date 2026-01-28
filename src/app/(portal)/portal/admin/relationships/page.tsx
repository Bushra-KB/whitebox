"use client";

import { useEffect, useMemo, useState } from "react";
import SectionCard from "@/components/portal/SectionCard";
import { adminInvoke } from "@/lib/adminApi";

type RelationshipRow = {
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

type RelationshipType = {
  relationship_type_id: number;
  name: string;
};

type OrgRow = {
  organization_id: number;
  name: string;
};

export default function AdminRelationshipsPage() {
  const [rows, setRows] = useState<RelationshipRow[]>([]);
  const [types, setTypes] = useState<RelationshipType[]>([]);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [form, setForm] = useState({
    parent_org_id: "",
    child_org_id: "",
    relationship_type_id: "",
    purchase_volume: "",
    contract_start_date: "",
    contract_end_date: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      adminInvoke<{ relationships: RelationshipRow[] }>("listRelationships"),
      adminInvoke<{ types: RelationshipType[] }>("listRelationshipTypes"),
      adminInvoke<{ organisations: OrgRow[] }>("listOrganisations"),
    ])
      .then(([relData, typeData, orgData]) => {
        if (!isMounted) return;
        setRows(relData.relationships);
        setTypes(typeData.types);
        setOrgs(orgData.organisations);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unable to load relationships.");
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const orgNameById = useMemo(
    () => Object.fromEntries(orgs.map((org) => [org.organization_id, org.name])),
    [orgs]
  );

  const addRelationship = async () => {
    if (!form.parent_org_id || !form.child_org_id || !form.relationship_type_id) {
      setError("Parent, child, and relationship type are required.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await adminInvoke("createRelationship", {
        parent_org_id: Number(form.parent_org_id),
        child_org_id: Number(form.child_org_id),
        relationship_type_id: Number(form.relationship_type_id),
        purchase_volume: form.purchase_volume ? Number(form.purchase_volume) : null,
        contract_start_date: form.contract_start_date || null,
        contract_end_date: form.contract_end_date || null,
        is_active: true,
      });
      const refreshed = await adminInvoke<{ relationships: RelationshipRow[] }>("listRelationships");
      setRows(refreshed.relationships);
      setForm({
        parent_org_id: "",
        child_org_id: "",
        relationship_type_id: "",
        purchase_volume: "",
        contract_start_date: "",
        contract_end_date: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add relationship.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleRelationship = async (id: number, current: boolean | null) => {
    setIsSaving(true);
    setError(null);
    try {
      await adminInvoke("updateRelationship", { relationship_id: id, is_active: !current });
      setRows((prev) =>
        prev.map((row) =>
          row.relationship_id === id ? { ...row, is_active: !current } : row
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update relationship.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SectionCard
      title="Supply Chains"
      description={`${rows.length} results`}
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
      <div className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-3">
        <select
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          value={form.parent_org_id}
          onChange={(event) => setForm((prev) => ({ ...prev, parent_org_id: event.target.value }))}
        >
          <option value="">Parent organisation</option>
          {orgs.map((org) => (
            <option key={org.organization_id} value={String(org.organization_id)}>
              {org.name}
            </option>
          ))}
        </select>
        <select
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          value={form.child_org_id}
          onChange={(event) => setForm((prev) => ({ ...prev, child_org_id: event.target.value }))}
        >
          <option value="">Child organisation</option>
          {orgs.map((org) => (
            <option key={org.organization_id} value={String(org.organization_id)}>
              {org.name}
            </option>
          ))}
        </select>
        <select
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          value={form.relationship_type_id}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, relationship_type_id: event.target.value }))
          }
        >
          <option value="">Relationship type</option>
          {types.map((type) => (
            <option key={type.relationship_type_id} value={String(type.relationship_type_id)}>
              {type.name}
            </option>
          ))}
        </select>
        <input
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          placeholder="Purchase volume"
          value={form.purchase_volume}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, purchase_volume: event.target.value.replace(/[^\d.]/g, "") }))
          }
        />
        <input
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          type="date"
          value={form.contract_start_date}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, contract_start_date: event.target.value }))
          }
        />
        <input
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          type="date"
          value={form.contract_end_date}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, contract_end_date: event.target.value }))
          }
        />
        <button
          type="button"
          className="rounded-full bg-[var(--wb-cobalt)] px-4 py-2 text-xs font-semibold text-white"
          onClick={addRelationship}
          disabled={isSaving}
        >
          Add relationship
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.2em] text-slate-400">
            <tr>
              <th className="px-4 py-3">No</th>
              <th className="px-4 py-3">Parent</th>
              <th className="px-4 py-3">Child</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Purchase Volume</th>
              <th className="px-4 py-3">Contract</th>
              <th className="px-4 py-3">Active</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.relationship_id} className="border-t border-slate-100">
                <td className="px-4 py-3">{index + 1}</td>
                <td className="px-4 py-3">{orgNameById[row.parent_org_id] || "-"}</td>
                <td className="px-4 py-3">{orgNameById[row.child_org_id] || "-"}</td>
                <td className="px-4 py-3">
                  {types.find((type) => type.relationship_type_id === row.relationship_type_id)?.name ||
                    "-"}
                </td>
                <td className="px-4 py-3">{row.purchase_volume ?? "-"}</td>
                <td className="px-4 py-3">
                  {row.contract_start_date || "-"} → {row.contract_end_date || "-"}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 px-2 py-1 text-[11px]"
                    onClick={() => toggleRelationship(row.relationship_id, row.is_active)}
                    disabled={isSaving}
                  >
                    {row.is_active ? "Active" : "Disabled"}
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
