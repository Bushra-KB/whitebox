"use client";

import { useEffect, useMemo, useState } from "react";
import SectionCard from "@/components/portal/SectionCard";
import { adminInvoke } from "@/lib/adminApi";

type UserRow = {
  user_id: string;
  display_name: string | null;
  email: string | null;
  department: string | null;
  created_at: string | null;
  user_type: string;
  is_active: boolean;
  organisation: string;
};

const roleOptions = ["administrator", "organization_owner", "independent", "anonymous"];

export default function AdminUsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    adminInvoke<{ users: UserRow[] }>("listUsers")
      .then((data) => {
        if (!isMounted) return;
        setRows(data.users);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unable to load users.");
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredRows = useMemo(() => {
    if (!roleFilter) return rows;
    return rows.filter((row) => row.user_type === roleFilter);
  }, [rows, roleFilter]);

  const updateUser = async (userId: string, updates: Record<string, unknown>) => {
    setIsSaving(true);
    setError(null);
    try {
      await adminInvoke("updateUser", { user_id: userId, ...updates });
      setRows((prev) =>
        prev.map((row) => (row.user_id === userId ? { ...row, ...updates } : row))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update user.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SectionCard
      title="Users"
      description={`${filteredRows.length} results`}
      actions={
        <div className="flex items-center gap-2">
          <select className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600">
            <option>Sort</option>
            <option>Newest</option>
          </select>
          <select
            className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
          >
            <option value="">Filter</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
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
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Organization</th>
              <th className="px-4 py-3">Departments</th>
              <th className="px-4 py-3">Creation Date</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, index) => (
              <tr key={row.user_id} className="border-t border-slate-100">
                <td className="px-4 py-3">{index + 1}</td>
                <td className="px-4 py-3 font-semibold text-slate-800">
                  {row.display_name || "-"}
                </td>
                <td className="px-4 py-3">{row.email || "-"}</td>
                <td className="px-4 py-3">{row.organisation}</td>
                <td className="px-4 py-3">{row.department || "-"}</td>
                <td className="px-4 py-3">
                  {row.created_at ? new Date(row.created_at).toLocaleDateString() : "-"}
                </td>
                <td className="px-4 py-3">
                  <select
                    className="rounded-full border border-slate-200 px-2 py-1 text-[11px]"
                    value={row.user_type}
                    disabled={isSaving}
                    onChange={(event) => updateUser(row.user_id, { user_type: event.target.value })}
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 px-2 py-1 text-[11px]"
                    disabled={isSaving}
                    onClick={() => updateUser(row.user_id, { is_active: !row.is_active })}
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
