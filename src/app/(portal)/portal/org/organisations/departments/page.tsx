"use client";

import { useEffect, useState } from "react";
import EmptyState from "@/components/portal/EmptyState";
import Modal from "@/components/portal/Modal";
import SectionCard from "@/components/portal/SectionCard";
import { supabase } from "@/lib/supabase/client";
import { loadOrgContext } from "@/lib/orgContext";

export default function OrganisationDepartmentsPage() {
  const [departments, setDepartments] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [newDepartment, setNewDepartment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadDepartments = async () => {
      try {
        const context = await loadOrgContext();
        const { data: orgRow } = await supabase
          .from("organisations")
          .select("contact_info")
          .eq("organization_id", context.organizationId)
          .maybeSingle();
        let contactInfo: Record<string, unknown> = {};
        if (orgRow?.contact_info) {
          try {
            contactInfo = JSON.parse(orgRow.contact_info);
          } catch {
            contactInfo = {};
          }
        }
        const stored = Array.isArray(contactInfo.departments) ? contactInfo.departments : [];
        if (!isMounted) return;
        setDepartments(stored.filter(Boolean));
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unable to load departments.");
      }
    };
    loadDepartments();
    return () => {
      isMounted = false;
    };
  }, []);

  const persistDepartments = async (next: string[]) => {
    setSaving(true);
    setError(null);
    try {
      const context = await loadOrgContext();
      const { data: orgRow } = await supabase
        .from("organisations")
        .select("contact_info")
        .eq("organization_id", context.organizationId)
        .maybeSingle();
      let contactInfo: Record<string, unknown> = {};
      if (orgRow?.contact_info) {
        try {
          contactInfo = JSON.parse(orgRow.contact_info);
        } catch {
          contactInfo = {};
        }
      }
      const updated = { ...contactInfo, departments: next };
      const { error: updateError } = await supabase
        .from("organisations")
        .update({ contact_info: JSON.stringify(updated) })
        .eq("organization_id", context.organizationId);
      if (updateError) throw updateError;
      setDepartments(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update departments.");
    } finally {
      setSaving(false);
    }
  };

  const addDepartment = async () => {
    if (!newDepartment.trim()) return;
    const next = Array.from(new Set([...departments, newDepartment.trim()]));
    await persistDepartments(next);
    setNewDepartment("");
    setOpen(false);
  };

  const removeDepartment = async (name: string) => {
    const next = departments.filter((dept) => dept !== name);
    await persistDepartments(next);
  };

  return (
    <>
      <SectionCard
        title="Departments"
        description="Control data visibility by department and region."
        actions={
          <button
            className="rounded-full bg-[var(--wb-cobalt)] px-4 py-2 text-xs font-semibold text-white"
            onClick={() => setOpen(true)}
          >
            New department
          </button>
        }
      >
        {departments.length ? (
          <div className="space-y-3">
            {departments.map((dept) => (
              <div
                key={dept}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
              >
                <span className="font-semibold">{dept}</span>
                <button
                  className="rounded-full border border-rose-200 px-3 py-1 text-[11px] text-rose-500"
                  onClick={() => removeDepartment(dept)}
                  disabled={saving}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No departments configured"
            description="Create departments to separate sensitive data access and assign report scopes."
            actionLabel="Add department"
          />
        )}
      </SectionCard>

      <Modal
        open={open}
        title="Add department"
        description="Create a department label for your organisation."
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
              onClick={addDepartment}
              disabled={saving}
            >
              Save
            </button>
          </>
        }
      >
        <div>
          <label className="text-xs font-semibold text-slate-500">Department name</label>
          <input
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={newDepartment}
            onChange={(event) => setNewDepartment(event.target.value)}
          />
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
