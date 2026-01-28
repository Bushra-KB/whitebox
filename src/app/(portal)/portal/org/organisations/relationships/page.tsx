"use client";

import { useEffect, useState } from "react";
import EmptyState from "@/components/portal/EmptyState";
import Modal from "@/components/portal/Modal";
import SectionCard from "@/components/portal/SectionCard";
import { supabase } from "@/lib/supabase/client";
import { loadOrgContext } from "@/lib/orgContext";

type RelationshipRow = {
  relationship_id: number;
  parent_org_id: number;
  child_org_id: number;
  relationship_type_id: number;
  relationship_types: { name: string } | null;
  parent_org: { name: string } | null;
  child_org: { name: string } | null;
};

type OrgOption = { id: number; name: string };
type RelationshipTypeOption = { id: number; name: string };

export default function OrganisationRelationshipsPage() {
  const [rows, setRows] = useState<RelationshipRow[]>([]);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [types, setTypes] = useState<RelationshipTypeOption[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    relationTypeId: "",
    direction: "parent",
    orgId: "",
  });

  useEffect(() => {
    let isMounted = true;
    const loadRelationships = async () => {
      try {
        const context = await loadOrgContext();
        const [{ data: relationshipRows }, { data: orgRows }, { data: typeRows }] =
          await Promise.all([
            supabase
              .from("organization_relationships")
              .select(
                "relationship_id,parent_org_id,child_org_id,relationship_type_id,relationship_types(name),parent_org:organisations!organization_relationships_parent_org_id_fkey(name),child_org:organisations!organization_relationships_child_org_id_fkey(name)"
              )
              .or(
                `parent_org_id.eq.${context.organizationId},child_org_id.eq.${context.organizationId}`
              )
              .order("created_at", { ascending: false }),
            supabase.from("organisations").select("organization_id,name").order("name"),
            supabase.from("relationship_types").select("relationship_type_id,name").order("name"),
          ]);

        if (!isMounted) return;
        setRows(relationshipRows ?? []);
        setOrgs(
          orgRows?.map((row) => ({ id: row.organization_id, name: row.name })) ?? []
        );
        setTypes(
          typeRows?.map((row) => ({ id: row.relationship_type_id, name: row.name })) ?? []
        );
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unable to load relationships.");
      }
    };
    loadRelationships();
    return () => {
      isMounted = false;
    };
  }, []);

  const createRelationship = async () => {
    if (!form.relationTypeId || !form.orgId) {
      setError("Select a relationship type and organisation.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const context = await loadOrgContext();
      const isParent = form.direction === "parent";
      const payload = {
        relationship_type_id: Number(form.relationTypeId),
        parent_org_id: isParent ? context.organizationId : Number(form.orgId),
        child_org_id: isParent ? Number(form.orgId) : context.organizationId,
      };
      const { data: insertRow, error: insertError } = await supabase
        .from("organization_relationships")
        .insert(payload)
        .select(
          "relationship_id,parent_org_id,child_org_id,relationship_type_id,relationship_types(name),parent_org:organisations!organization_relationships_parent_org_id_fkey(name),child_org:organisations!organization_relationships_child_org_id_fkey(name)"
        )
        .single();
      if (insertError || !insertRow) {
        throw new Error(insertError?.message ?? "Unable to create relationship.");
      }
      setRows((prev) => [insertRow, ...prev]);
      setForm({ relationTypeId: "", direction: "parent", orgId: "" });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create relationship.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SectionCard
        title="Relationships"
        description="Maintain the supply-chain graph and buyer/supplier links."
        actions={
          <button
            className="rounded-full bg-[var(--wb-cobalt)] px-4 py-2 text-xs font-semibold text-white"
            onClick={() => setOpen(true)}
          >
            Connect org
          </button>
        }
      >
        {rows.length ? (
          <div className="space-y-3">
            {rows.map((row) => (
              <div
                key={row.relationship_id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {row.parent_org?.name ?? "Parent"} → {row.child_org?.name ?? "Child"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {row.relationship_types?.name ?? "Relationship"}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                  Active
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No relationships configured"
            description="Add parent or child organisations to build the supply-chain visibility map."
            actionLabel="Add relationship"
          />
        )}
      </SectionCard>

      <Modal
        open={open}
        title="Connect organisation"
        description="Set up a supplier or customer relationship."
        onClose={() => setOpen(false)}
        actions={
          <>
            <button
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button
              className="rounded-full bg-[var(--wb-cobalt)] px-4 py-2 text-xs font-semibold text-white"
              onClick={createRelationship}
              disabled={saving}
            >
              Save
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500">Relationship type</label>
            <select
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.relationTypeId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, relationTypeId: event.target.value }))
              }
            >
              <option value="">Select type</option>
              {types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Direction</label>
            <select
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.direction}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, direction: event.target.value }))
              }
            >
              <option value="parent">We are the parent</option>
              <option value="child">We are the child</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Organisation</label>
            <select
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.orgId}
              onChange={(event) => setForm((prev) => ({ ...prev, orgId: event.target.value }))}
            >
              <option value="">Select organisation</option>
              {orgs.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {error ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      ) : null}
    </>
  );
}
