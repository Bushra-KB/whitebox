"use client";

import { useEffect, useState } from "react";
import EmptyState from "@/components/portal/EmptyState";
import Modal from "@/components/portal/Modal";
import SectionCard from "@/components/portal/SectionCard";
import { supabase } from "@/lib/supabase/client";
import { loadOrgContext } from "@/lib/orgContext";

type PolicyRow = {
  policy_id: number;
  title: string;
  description: string | null;
  version: number;
  is_active: boolean | null;
};

export default function OrganisationPoliciesPage() {
  const [tab, setTab] = useState<"policies" | "automation">("policies");
  const [rows, setRows] = useState<PolicyRow[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", content: "" });
  const [automation, setAutomation] = useState({
    enable_out_of_scope_filtering: false,
    enable_accepted_filtering: false,
  });

  useEffect(() => {
    let isMounted = true;
    const loadPolicies = async () => {
      try {
        const context = await loadOrgContext();
        const { data: policyRows } = await supabase
          .from("policies")
          .select("policy_id,title,description,version,is_active")
          .eq("policy_type", "organization")
          .eq("organization_id", context.organizationId)
          .order("created_at", { ascending: false });

        const { data: orgRow } = await supabase
          .from("organisations")
          .select("enable_out_of_scope_filtering,enable_accepted_filtering")
          .eq("organization_id", context.organizationId)
          .maybeSingle();

        if (!isMounted) return;
        setRows(policyRows ?? []);
        setAutomation({
          enable_out_of_scope_filtering: orgRow?.enable_out_of_scope_filtering ?? false,
          enable_accepted_filtering: orgRow?.enable_accepted_filtering ?? false,
        });
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unable to load policies.");
      }
    };

    loadPolicies();
    return () => {
      isMounted = false;
    };
  }, []);

  const createPolicy = async () => {
    if (!form.title.trim()) {
      setError("Policy title is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const context = await loadOrgContext();
      const content = form.content
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const { data: insertRow, error: insertError } = await supabase
        .from("policies")
        .insert({
          policy_type: "organization",
          organization_id: context.organizationId,
          title: form.title.trim(),
          description: form.description.trim() || null,
          content,
          is_active: true,
        })
        .select("policy_id,title,description,version,is_active")
        .single();
      if (insertError || !insertRow) {
        throw new Error(insertError?.message ?? "Unable to create policy.");
      }
      setRows((prev) => [insertRow, ...prev]);
      setForm({ title: "", description: "", content: "" });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create policy.");
    } finally {
      setSaving(false);
    }
  };

  const togglePolicy = async (policyId: number, isActive: boolean | null) => {
    setSaving(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from("policies")
        .update({ is_active: !isActive })
        .eq("policy_id", policyId);
      if (updateError) throw updateError;
      setRows((prev) =>
        prev.map((row) =>
          row.policy_id === policyId ? { ...row, is_active: !isActive } : row
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update policy.");
    } finally {
      setSaving(false);
    }
  };

  const updateAutomation = async (key: keyof typeof automation, value: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const context = await loadOrgContext();
      const { error: updateError } = await supabase
        .from("organisations")
        .update({ [key]: value })
        .eq("organization_id", context.organizationId);
      if (updateError) throw updateError;
      setAutomation((prev) => ({ ...prev, [key]: value }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update automation settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SectionCard
        title="Policies"
        description="Publish organisational policies and manage automation settings."
        actions={
          tab === "policies" ? (
            <button
              className="rounded-full bg-[var(--wb-cobalt)] px-4 py-2 text-xs font-semibold text-white"
              onClick={() => setOpen(true)}
            >
              New
            </button>
          ) : null
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <button
            className={`rounded-full px-4 py-2 text-xs font-semibold ${
              tab === "policies"
                ? "bg-[var(--wb-cobalt)] text-white"
                : "border border-slate-200 text-slate-500"
            }`}
            onClick={() => setTab("policies")}
          >
            Policies
          </button>
          <button
            className={`rounded-full px-4 py-2 text-xs font-semibold ${
              tab === "automation"
                ? "bg-[var(--wb-cobalt)] text-white"
                : "border border-slate-200 text-slate-500"
            }`}
            onClick={() => setTab("automation")}
          >
            Automation
          </button>
        </div>

        <div className="mt-6">
          {tab === "policies" ? (
            rows.length ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Version</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.policy_id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-semibold text-slate-900">{row.title}</td>
                        <td className="px-4 py-3">v{row.version}</td>
                        <td className="px-4 py-3">
                          <button
                            className="rounded-full border border-slate-200 px-3 py-1 text-[11px]"
                            onClick={() => togglePolicy(row.policy_id, row.is_active)}
                            disabled={saving}
                          >
                            {row.is_active ? "Active" : "Paused"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No policies published"
                description="Upload policy documents to meet GDPR and grievance procedure requirements."
                actionLabel="Add new"
              />
            )
          ) : (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Out-of-scope filter</p>
                  <p className="text-xs text-slate-500">Flag out-of-scope cases for review.</p>
                </div>
                <button
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
                  onClick={() =>
                    updateAutomation("enable_out_of_scope_filtering", !automation.enable_out_of_scope_filtering)
                  }
                  disabled={saving}
                >
                  {automation.enable_out_of_scope_filtering ? "Enabled" : "Disabled"}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Accepted filter</p>
                  <p className="text-xs text-slate-500">Enable acceptance workflow guidance.</p>
                </div>
                <button
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
                  onClick={() =>
                    updateAutomation("enable_accepted_filtering", !automation.enable_accepted_filtering)
                  }
                  disabled={saving}
                >
                  {automation.enable_accepted_filtering ? "Enabled" : "Disabled"}
                </button>
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      <Modal
        open={open}
        title="New policy"
        description="Create an organisation policy and publish it to users."
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
              onClick={createPolicy}
              disabled={saving}
            >
              Publish
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500">Title</label>
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Description</label>
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Policy content</label>
            <textarea
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              rows={4}
              placeholder="Add one bullet per line"
              value={form.content}
              onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
            />
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
