"use client";

import { useEffect, useState } from "react";
import SectionCard from "@/components/portal/SectionCard";
import Modal from "@/components/portal/Modal";
import { supabase } from "@/lib/supabase/client";
import { loadOrgContext } from "@/lib/orgContext";
import { isValidEmail } from "@/lib/validation";

type OrgUserRow = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role_id: number | null;
  role_name: string | null;
  department: string | null;
  job_title: string | null;
  is_active: boolean | null;
};

type RoleRow = {
  role_id: number;
  name: string;
};

export default function OrganisationUsersPage() {
  const [rows, setRows] = useState<OrgUserRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: "",
    role_id: "",
    department: "",
    job_title: "",
  });

  useEffect(() => {
    let isMounted = true;
    const loadUsers = async () => {
      try {
        const context = await loadOrgContext();
        const [{ data: userRows }, { data: roleRows }] = await Promise.all([
          supabase
            .from("organisation_users_with_roles")
            .select(
              "user_id,first_name,last_name,email,role_id,role_name,department,job_title,is_active"
            )
            .eq("organization_id", context.organizationId),
          supabase.from("roles").select("role_id,name").order("name"),
        ]);
        if (!isMounted) return;
        setRows(userRows ?? []);
        setRoles(roleRows ?? []);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unable to load users.");
      }
    };
    loadUsers();
    return () => {
      isMounted = false;
    };
  }, []);

  const updateUser = async (userId: string, updates: Partial<OrgUserRow>) => {
    setSaving(true);
    setError(null);
    try {
      const context = await loadOrgContext();
      const { error: updateError } = await supabase
        .from("organization_users")
        .update({
          role_id: updates.role_id ?? null,
          department: updates.department ?? null,
          job_title: updates.job_title ?? null,
          is_active: updates.is_active ?? null,
        })
        .eq("user_id", userId)
        .eq("organization_id", context.organizationId);
      if (updateError) throw updateError;
      setRows((prev) =>
        prev.map((row) => (row.user_id === userId ? { ...row, ...updates } : row))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update user.");
    } finally {
      setSaving(false);
    }
  };

  const inviteUser = async () => {
    if (!isValidEmail(form.email)) {
      setError("Enter a valid email.");
      return;
    }
    if (!form.role_id) {
      setError("Select a role.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const context = await loadOrgContext();
      const { data: profileRow } = await supabase
        .from("user_profiles")
        .select("user_id,first_name,last_name,email")
        .eq("email", form.email.trim().toLowerCase())
        .maybeSingle();
      if (!profileRow?.user_id) {
        throw new Error("User not found. Ask them to sign up first.");
      }

      const { error: insertError } = await supabase.from("organization_users").insert({
        user_id: profileRow.user_id,
        organization_id: context.organizationId,
        role_id: Number(form.role_id),
        department: form.department || null,
        job_title: form.job_title || null,
        is_active: true,
      });
      if (insertError) throw insertError;

      setRows((prev) => [
        {
          user_id: profileRow.user_id,
          first_name: profileRow.first_name ?? null,
          last_name: profileRow.last_name ?? null,
          email: profileRow.email ?? form.email,
          role_id: Number(form.role_id),
          role_name: roles.find((role) => role.role_id === Number(form.role_id))?.name ?? null,
          department: form.department || null,
          job_title: form.job_title || null,
          is_active: true,
        },
        ...prev,
      ]);
      setForm({ email: "", role_id: "", department: "", job_title: "" });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to invite user.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SectionCard
        title="Users"
        description="Invite team members and manage roles."
        actions={
          <button
            className="rounded-full bg-[var(--wb-cobalt)] px-4 py-2 text-xs font-semibold text-white"
            onClick={() => setOpen(true)}
          >
            Invite user
          </button>
        }
      >
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.2em] text-slate-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.user_id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {[row.first_name, row.last_name].filter(Boolean).join(" ") || row.email || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded-full border border-slate-200 px-2 py-1 text-[11px]"
                      value={row.role_id ?? ""}
                      onChange={(event) =>
                        updateUser(row.user_id, { role_id: Number(event.target.value) })
                      }
                      disabled={saving}
                    >
                      <option value="">Select role</option>
                      {roles.map((role) => (
                        <option key={role.role_id} value={role.role_id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">{row.department || "-"}</td>
                  <td className="px-4 py-3">
                    <button
                      className="rounded-full border border-slate-200 px-3 py-1 text-[11px]"
                      onClick={() => updateUser(row.user_id, { is_active: !row.is_active })}
                      disabled={saving}
                    >
                      {row.is_active ? "Active" : "Disabled"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <Modal
        open={open}
        title="Invite user"
        description="Add an existing user account to your organisation."
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
              onClick={inviteUser}
              disabled={saving}
            >
              Invite
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500">Email</label>
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Role</label>
            <select
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.role_id}
              onChange={(event) => setForm((prev) => ({ ...prev, role_id: event.target.value }))}
            >
              <option value="">Select role</option>
              {roles.map((role) => (
                <option key={role.role_id} value={role.role_id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Department</label>
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.department}
              onChange={(event) => setForm((prev) => ({ ...prev, department: event.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Job title</label>
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.job_title}
              onChange={(event) => setForm((prev) => ({ ...prev, job_title: event.target.value }))}
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
