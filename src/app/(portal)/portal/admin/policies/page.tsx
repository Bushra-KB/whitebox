"use client";

import { useEffect, useState } from "react";
import SectionCard from "@/components/portal/SectionCard";
import { adminInvoke } from "@/lib/adminApi";

type PolicyRow = {
  policy_id: number;
  policy_type: "global" | "organization";
  organization_id: number | null;
  version: number;
  title: string;
  description: string | null;
  is_active: boolean | null;
  created_at: string | null;
};

export default function AdminPoliciesPage() {
  const [rows, setRows] = useState<PolicyRow[]>([]);
  const [form, setForm] = useState({
    policy_type: "global",
    organization_id: "",
    title: "",
    description: "",
    content: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    adminInvoke<{ policies: PolicyRow[] }>("listPolicies")
      .then((data) => {
        if (!isMounted) return;
        setRows(data.policies);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unable to load policies.");
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const addPolicy = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      setError("Title and content are required.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await adminInvoke("createPolicy", {
        policy_type: form.policy_type,
        organization_id: form.organization_id ? Number(form.organization_id) : null,
        title: form.title.trim(),
        description: form.description.trim() || null,
        content: form.content
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
      });
      const refreshed = await adminInvoke<{ policies: PolicyRow[] }>("listPolicies");
      setRows(refreshed.policies);
      setForm({ policy_type: "global", organization_id: "", title: "", description: "", content: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create policy.");
    } finally {
      setIsSaving(false);
    }
  };

  const togglePolicy = async (policyId: number, current: boolean | null) => {
    setIsSaving(true);
    setError(null);
    try {
      await adminInvoke("updatePolicy", { policy_id: policyId, is_active: !current });
      setRows((prev) =>
        prev.map((row) =>
          row.policy_id === policyId ? { ...row, is_active: !current } : row
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update policy.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SectionCard
      title="Policies"
      description={`${rows.length} results`}
      actions={
        <button
          type="button"
          className="rounded-full bg-[var(--wb-cobalt)] px-4 py-2 text-xs font-semibold text-white"
          onClick={addPolicy}
          disabled={isSaving}
        >
          New policy
        </button>
      }
    >
      <div className="mb-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2">
        <select
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          value={form.policy_type}
          onChange={(event) => setForm((prev) => ({ ...prev, policy_type: event.target.value }))}
        >
          <option value="global">Global</option>
          <option value="organization">Organization</option>
        </select>
        <input
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          placeholder="Organization ID (optional)"
          value={form.organization_id}
          onChange={(event) => setForm((prev) => ({ ...prev, organization_id: event.target.value }))}
        />
        <input
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          placeholder="Policy title"
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
        />
        <input
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          placeholder="Short description"
          value={form.description}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
        />
        <textarea
          className="min-h-[120px] rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2"
          placeholder="Policy content (one item per line)"
          value={form.content}
          onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.2em] text-slate-400">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Organization</th>
              <th className="px-4 py-3">Version</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Active</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.policy_id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-semibold text-slate-800">{row.title}</td>
                <td className="px-4 py-3">{row.policy_type}</td>
                <td className="px-4 py-3">{row.organization_id ?? "-"}</td>
                <td className="px-4 py-3">v{row.version}</td>
                <td className="px-4 py-3">
                  {row.created_at ? new Date(row.created_at).toLocaleDateString() : "-"}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 px-2 py-1 text-[11px]"
                    onClick={() => togglePolicy(row.policy_id, row.is_active)}
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
