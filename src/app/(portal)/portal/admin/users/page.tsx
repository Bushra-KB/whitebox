"use client";

import { useEffect, useMemo, useState } from "react";
import SectionCard from "@/components/portal/SectionCard";
import { adminInvoke } from "@/lib/adminApi";

type UserRow = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  email: string | null;
  department: string | null;
  job_title: string | null;
  created_at: string | null;
  user_type: string;
  is_active: boolean;
  organisation: string;
};

type UserDraft = {
  user_type: string;
  department: string;
  job_title: string;
};

const roleOptions = [
  "administrator",
  "organization_owner",
  "independent",
  "anonymous",
];

const sortOptions = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "name_asc", label: "Name (A-Z)" },
  { value: "name_desc", label: "Name (Z-A)" },
] as const;

type SortMode = (typeof sortOptions)[number]["value"];

function getDisplayName(row: UserRow) {
  const fullName = `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim();
  return row.display_name?.trim() || fullName || "-";
}

function normalizeUserTypeForUi(value: string | null | undefined) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (normalized === "admin" || normalized === "system_admin") {
    return "administrator";
  }
  return normalized || "independent";
}

function toUserDraft(row: UserRow): UserDraft {
  return {
    user_type: normalizeUserTypeForUi(row.user_type),
    department: row.department ?? "",
    job_title: row.job_title ?? "",
  };
}

export default function AdminUsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [isLoading, setIsLoading] = useState(false);
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<UserDraft | null>(null);
  const [isModalSaving, setIsModalSaving] = useState(false);

  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminInvoke<{ users: UserRow[] }>("listUsers");
      setRows(
        data.users.map((row) => ({
          ...row,
          user_type: normalizeUserTypeForUi(row.user_type),
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load users.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers().catch(() => {
      /* handled in loadUsers */
    });
  }, []);

  const setUserSaving = (userId: string, value: boolean) => {
    setSavingIds((prev) => ({
      ...prev,
      [userId]: value,
    }));
  };

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const result = rows.filter((row) => {
      if (roleFilter && row.user_type !== roleFilter) return false;
      if (statusFilter === "active" && !row.is_active) return false;
      if (statusFilter === "disabled" && row.is_active) return false;

      if (!normalizedQuery) return true;
      const searchable = [
        getDisplayName(row),
        row.email ?? "",
        row.organisation ?? "",
        row.department ?? "",
        row.job_title ?? "",
        row.user_type ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });

    result.sort((a, b) => {
      if (sortMode === "newest") {
        return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
      }
      if (sortMode === "oldest") {
        return new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
      }
      const nameA = getDisplayName(a).toLowerCase();
      const nameB = getDisplayName(b).toLowerCase();
      if (sortMode === "name_desc") return nameB.localeCompare(nameA);
      return nameA.localeCompare(nameB);
    });

    return result;
  }, [query, roleFilter, rows, sortMode, statusFilter]);

  const activeCount = useMemo(() => rows.filter((row) => row.is_active).length, [rows]);
  const disabledCount = rows.length - activeCount;

  const selectedUser = useMemo(
    () => rows.find((row) => row.user_id === selectedUserId) ?? null,
    [rows, selectedUserId]
  );

  const hasModalChanges = useMemo(() => {
    if (!selectedUser || !editDraft) return false;
    return (
      editDraft.user_type !== selectedUser.user_type ||
      editDraft.department.trim() !== (selectedUser.department ?? "").trim() ||
      editDraft.job_title.trim() !== (selectedUser.job_title ?? "").trim()
    );
  }, [editDraft, selectedUser]);

  const openEditModal = (row: UserRow) => {
    setSelectedUserId(row.user_id);
    setEditDraft(toUserDraft(row));
  };

  const closeEditModal = () => {
    setSelectedUserId(null);
    setEditDraft(null);
    setIsModalSaving(false);
  };

  const saveModalUser = async () => {
    if (!selectedUser || !editDraft) return;
    const updates: Record<string, unknown> = {};

    if (editDraft.user_type !== selectedUser.user_type) {
      updates.user_type = editDraft.user_type;
    }
    if (editDraft.department.trim() !== (selectedUser.department ?? "").trim()) {
      updates.department = editDraft.department.trim();
    }
    if (editDraft.job_title.trim() !== (selectedUser.job_title ?? "").trim()) {
      updates.job_title = editDraft.job_title.trim();
    }
    if (!Object.keys(updates).length) return;

    setIsModalSaving(true);
    setError(null);
    try {
      await adminInvoke("updateUser", { user_id: selectedUser.user_id, ...updates });
      setRows((prev) =>
        prev.map((row) =>
          row.user_id === selectedUser.user_id
            ? {
                ...row,
                user_type:
                  typeof updates.user_type === "string" ? updates.user_type : row.user_type,
                department:
                  updates.department !== undefined
                    ? String(updates.department).trim() || null
                    : row.department,
                job_title:
                  updates.job_title !== undefined
                    ? String(updates.job_title).trim() || null
                    : row.job_title,
              }
            : row
        )
      );
      closeEditModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update user.");
      setIsModalSaving(false);
    }
  };

  const toggleUserStatus = async (row: UserRow) => {
    setUserSaving(row.user_id, true);
    setError(null);
    try {
      await adminInvoke("updateUser", {
        user_id: row.user_id,
        is_active: !row.is_active,
      });
      setRows((prev) =>
        prev.map((current) =>
          current.user_id === row.user_id ? { ...current, is_active: !current.is_active } : current
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update status.");
    } finally {
      setUserSaving(row.user_id, false);
    }
  };

  return (
    <>
      <SectionCard
        title="Users"
        description={`${filteredRows.length} results · ${activeCount} active · ${disabledCount} disabled`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600"
              placeholder="Search name, email, org, department"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <select
              className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
            >
              <option value="">All roles</option>
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <select
              className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
            <select
              className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600"
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600"
              onClick={() => loadUsers()}
              disabled={isLoading}
            >
              Refresh
            </button>
          </div>
        }
      >
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">No</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Organization</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Job title</th>
                  <th className="px-4 py-3">Creation date</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, index) => {
                  const userSaving = Boolean(savingIds[row.user_id]);
                  return (
                    <tr key={row.user_id} className="border-t border-slate-100 align-top">
                      <td className="px-4 py-3">{index + 1}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{getDisplayName(row)}</td>
                      <td className="px-4 py-3">{row.email || "-"}</td>
                      <td className="px-4 py-3">{row.organisation}</td>
                      <td className="px-4 py-3">{row.department || "-"}</td>
                      <td className="px-4 py-3">{row.job_title || "-"}</td>
                      <td className="px-4 py-3">
                        {row.created_at ? new Date(row.created_at).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full border border-slate-200 px-2 py-1 text-[11px] text-slate-700">
                          {row.user_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className={`rounded-full border px-2 py-1 text-[11px] ${
                            row.is_active
                              ? "border-emerald-200 text-emerald-700"
                              : "border-rose-200 text-rose-700"
                          }`}
                          disabled={userSaving}
                          onClick={() => toggleUserStatus(row)}
                        >
                          {row.is_active ? "Active" : "Disabled"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="rounded border border-slate-200 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-50"
                          onClick={() => openEditModal(row)}
                          disabled={userSaving}
                        >
                          Edit user
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {isLoading ? (
          <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Loading users...
          </p>
        ) : null}

        {!isLoading && !filteredRows.length ? (
          <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            No users found with current filters.
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {error}
          </p>
        ) : null}
      </SectionCard>

      {selectedUser && editDraft ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/45 p-4"
          onClick={closeEditModal}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">User management</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">{getDisplayName(selectedUser)}</h3>
                <p className="text-sm text-slate-500">{selectedUser.email || "-"}</p>
              </div>
              <button
                type="button"
                className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600"
                onClick={closeEditModal}
                disabled={isModalSaving}
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-xs text-slate-500">
                Role
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                  value={editDraft.user_type}
                  onChange={(event) =>
                    setEditDraft((prev) =>
                      prev ? { ...prev, user_type: event.target.value } : prev
                    )
                  }
                  disabled={isModalSaving}
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs text-slate-500">
                Department
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                  value={editDraft.department}
                  onChange={(event) =>
                    setEditDraft((prev) =>
                      prev ? { ...prev, department: event.target.value } : prev
                    )
                  }
                  disabled={isModalSaving}
                />
              </label>

              <label className="text-xs text-slate-500 sm:col-span-2">
                Job title
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                  value={editDraft.job_title}
                  onChange={(event) =>
                    setEditDraft((prev) =>
                      prev ? { ...prev, job_title: event.target.value } : prev
                    )
                  }
                  disabled={isModalSaving}
                />
              </label>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600"
                onClick={() => setEditDraft(toUserDraft(selectedUser))}
                disabled={isModalSaving || !hasModalChanges}
              >
                Reset
              </button>
              <button
                type="button"
                className="rounded-xl bg-[var(--wb-navy)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                onClick={saveModalUser}
                disabled={isModalSaving || !hasModalChanges}
              >
                {isModalSaving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
