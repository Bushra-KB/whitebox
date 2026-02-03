"use client";

import { useEffect, useState } from "react";
import EmptyState from "@/components/portal/EmptyState";
import Modal from "@/components/portal/Modal";
import SectionCard from "@/components/portal/SectionCard";
import { supabase } from "@/lib/supabase/client";
import { loadOrgContext } from "@/lib/orgContext";
import { toIntOrNull } from "@/lib/validation";

type WorksiteRow = {
  worksite_id: number;
  name: string;
  address: string | null;
  city_code: string | null;
  country: string | null;
  white_collar_workers: number | null;
  blue_collar_workers: number | null;
  female_workers: number | null;
  total_employees: number | null;
};

type CountryOption = { id: string; name: string };

const emptyForm = {
  name: "",
  address: "",
  city_code: "",
  country: "",
  white_collar_workers: "",
  blue_collar_workers: "",
  female_workers: "",
};

export default function OrganisationWorksitesPage() {
  const [rows, setRows] = useState<WorksiteRow[]>([]);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WorksiteRow | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadWorksites = async () => {
      try {
        const context = await loadOrgContext();
        const [{ data: worksiteRows }, { data: countryRows }] = await Promise.all([
          supabase
            .from("worksites")
            .select(
              "worksite_id,name,address,city_code,country,white_collar_workers,blue_collar_workers,female_workers,total_employees"
            )
            .eq("organization_id", context.organizationId)
            .order("created_at", { ascending: false }),
          supabase.from("countries").select("country_id,country_name").order("country_name"),
        ]);

        if (!isMounted) return;
        setRows(worksiteRows ?? []);
        setCountries(
          countryRows?.map((row) => ({ id: String(row.country_id), name: row.country_name })) ?? []
        );
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unable to load worksites.");
      }
    };

    loadWorksites();
    return () => {
      isMounted = false;
    };
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  };

  const openEdit = (row: WorksiteRow) => {
    setEditing(row);
    setForm({
      name: row.name,
      address: row.address ?? "",
      city_code: row.city_code ?? "",
      country: row.country ?? "",
      white_collar_workers: row.white_collar_workers?.toString() ?? "",
      blue_collar_workers: row.blue_collar_workers?.toString() ?? "",
      female_workers: row.female_workers?.toString() ?? "",
    });
    setOpen(true);
  };

  const saveWorksite = async () => {
    if (!form.name.trim()) {
      setError("Worksite name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const context = await loadOrgContext();
      const payload = {
        name: form.name.trim(),
        address: form.address || null,
        city_code: form.city_code || null,
        country: form.country || null,
        white_collar_workers: toIntOrNull(form.white_collar_workers),
        blue_collar_workers: toIntOrNull(form.blue_collar_workers),
        female_workers: toIntOrNull(form.female_workers),
      };

      if (editing) {
        const { error: updateError } = await supabase
          .from("worksites")
          .update(payload)
          .eq("worksite_id", editing.worksite_id)
          .eq("organization_id", context.organizationId);
        if (updateError) throw updateError;
        setRows((prev) =>
          prev.map((row) =>
            row.worksite_id === editing.worksite_id ? { ...row, ...payload } : row
          )
        );
      } else {
        const { data: insertRow, error: insertError } = await supabase
          .from("worksites")
          .insert({ organization_id: context.organizationId, ...payload })
          .select(
            "worksite_id,name,address,city_code,country,white_collar_workers,blue_collar_workers,female_workers,total_employees"
          )
          .single();
        if (insertError || !insertRow) {
          throw new Error(insertError?.message ?? "Unable to create worksite.");
        }
        setRows((prev) => [insertRow, ...prev]);
      }

      setOpen(false);
      setEditing(null);
      setForm({ ...emptyForm });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save worksite.");
    } finally {
      setSaving(false);
    }
  };

  const deleteWorksite = async (worksiteId: number) => {
    setSaving(true);
    setError(null);
    try {
      const context = await loadOrgContext();
      const { error: deleteError } = await supabase
        .from("worksites")
        .delete()
        .eq("worksite_id", worksiteId)
        .eq("organization_id", context.organizationId);
      if (deleteError) throw deleteError;
      setRows((prev) => prev.filter((row) => row.worksite_id !== worksiteId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete worksite.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SectionCard
        title="Worksites"
        description="Manage worksites to connect grievances with locations."
        actions={
          <button
            className="rounded-full bg-[var(--wb-cobalt)] px-4 py-2 text-xs font-semibold text-white"
            onClick={openNew}
          >
            New
          </button>
        }
      >
        {rows.length ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Country</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Employees</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.worksite_id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.name}</td>
                    <td className="px-4 py-3">{row.country || "-"}</td>
                    <td className="px-4 py-3">{row.city_code || "-"}</td>
                    <td className="px-4 py-3">{row.total_employees ?? "-"}</td>
                    <td className="px-4 py-3 space-x-2">
                      <button
                        className="rounded-full border border-slate-200 px-2 py-1 text-[11px]"
                        onClick={() => openEdit(row)}
                      >
                        Edit
                      </button>
                      <button
                        className="rounded-full border border-rose-200 px-2 py-1 text-[11px] text-rose-500"
                        onClick={() => deleteWorksite(row.worksite_id)}
                        disabled={saving}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No worksites yet"
            description="Add worksites to map incidents to specific facilities and teams."
            actionLabel="Add new"
            onAction={openNew}
          />
        )}
      </SectionCard>

      <Modal
        open={open}
        title={editing ? "Edit worksite" : "Add worksite"}
        description="Capture the location details for this worksite."
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
              onClick={saveWorksite}
              disabled={saving}
            >
              Save
            </button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-500">Worksite name</label>
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-500">Address</label>
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.address}
              onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">City</label>
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.city_code}
              onChange={(event) => setForm((prev) => ({ ...prev, city_code: event.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Country</label>
            <select
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.country}
              onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value }))}
            >
              <option value="">Select country</option>
              {countries.map((country) => (
                <option key={country.id} value={country.name}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">White collar</label>
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.white_collar_workers}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, white_collar_workers: event.target.value }))
              }
              inputMode="numeric"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Blue collar</label>
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.blue_collar_workers}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, blue_collar_workers: event.target.value }))
              }
              inputMode="numeric"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Female workers</label>
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.female_workers}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, female_workers: event.target.value }))
              }
              inputMode="numeric"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Total employees</label>
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
              value={
                (() => {
                  const white = toIntOrNull(form.white_collar_workers) ?? 0;
                  const blue = toIntOrNull(form.blue_collar_workers) ?? 0;
                  return String(white + blue);
                })()
              }
              readOnly
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Auto-calculated from white + blue collar workers.
            </p>
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
