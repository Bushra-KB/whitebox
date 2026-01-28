"use client";

import { useEffect, useMemo, useState } from "react";
import SectionCard from "@/components/portal/SectionCard";
import { supabase } from "@/lib/supabase/client";
import { loadOrgContext } from "@/lib/orgContext";
import { isValidUrl, joinList, splitList, toNumberOrNull } from "@/lib/validation";

type CountryOption = { id: string; name: string };
type SectorOption = { id: string; name: string };

type OrgForm = {
  name: string;
  organization_type: string;
  legal_type: string;
  address: string;
  city: string;
  country: string;
  website: string;
  company_code: string;
  employees_number: string;
  sectors: string;
  countries_with_activities: string;
  countries_with_suppliers: string;
  logo_url: string;
};

export default function OrganisationProfilePage() {
  const [form, setForm] = useState<OrgForm>({
    name: "",
    organization_type: "",
    legal_type: "",
    address: "",
    city: "",
    country: "",
    website: "",
    company_code: "",
    employees_number: "",
    sectors: "",
    countries_with_activities: "",
    countries_with_suppliers: "",
    logo_url: "",
  });
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [sectors, setSectors] = useState<SectorOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadOrg = async () => {
      try {
        const context = await loadOrgContext();
        const [{ data: orgRow }, { data: countryRows }, { data: sectorRows }] = await Promise.all([
          supabase
            .from("organisations")
            .select(
              "name,organization_type,legal_type,address,city,country,website,company_code,employees_number,countries_with_activities,countries_with_suppliers,sectors,logo,contact_info"
            )
            .eq("organization_id", context.organizationId)
            .maybeSingle(),
          supabase.from("countries").select("country_id,country_name").order("country_name"),
          supabase.from("sectors").select("id,name").order("name"),
        ]);

        if (!isMounted) return;
        let contactInfo: Record<string, unknown> = {};
        if (orgRow?.contact_info) {
          try {
            contactInfo = JSON.parse(orgRow.contact_info);
          } catch {
            contactInfo = {};
          }
        }
        const sectorList = Array.isArray(orgRow?.sectors)
          ? orgRow?.sectors
          : Array.isArray(contactInfo.sectors)
            ? contactInfo.sectors
            : [];
        const activityList = Array.isArray(orgRow?.countries_with_activities)
          ? orgRow?.countries_with_activities
          : Array.isArray(contactInfo.countries_activity)
            ? contactInfo.countries_activity
            : [];
        const supplierList = Array.isArray(orgRow?.countries_with_suppliers)
          ? orgRow?.countries_with_suppliers
          : Array.isArray(contactInfo.countries_suppliers)
            ? contactInfo.countries_suppliers
            : [];

        setForm({
          name: orgRow?.name ?? "",
          organization_type: orgRow?.organization_type ?? "",
          legal_type: orgRow?.legal_type ?? "",
          address: orgRow?.address ?? "",
          city: orgRow?.city ?? "",
          country: orgRow?.country ?? "",
          website: orgRow?.website ?? "",
          company_code: orgRow?.company_code ?? "",
          employees_number: orgRow?.employees_number?.toString() ?? "",
          sectors: joinList(sectorList),
          countries_with_activities: joinList(activityList),
          countries_with_suppliers: joinList(supplierList),
          logo_url: orgRow?.logo ?? contactInfo.logo_path ?? "",
        });
        setCountries(
          countryRows?.map((row) => ({ id: String(row.country_id), name: row.country_name })) ?? []
        );
        setSectors(sectorRows?.map((row) => ({ id: String(row.id), name: row.name })) ?? []);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unable to load organisation profile.");
      }
    };

    loadOrg();
    return () => {
      isMounted = false;
    };
  }, []);

  const sectorSuggestions = useMemo(
    () => sectors.map((sector) => sector.name).filter(Boolean),
    [sectors]
  );

  const uploadLogo = async (file: File) => {
    const context = await loadOrgContext();
    const fileExt = file.name.split(".").pop() || "png";
    const filePath = `org-logos/${context.organizationId}/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from("organisation-logos")
      .upload(filePath, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from("organisation-logos").getPublicUrl(filePath);
    return data.publicUrl || filePath;
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    if (!form.name.trim()) {
      setError("Organisation name is required.");
      return;
    }
    if (form.website && !isValidUrl(form.website)) {
      setError("Enter a valid website URL.");
      return;
    }

    setSaving(true);
    try {
      const context = await loadOrgContext();
      const nextContactInfo = {
        logo_path: form.logo_url || null,
        sectors: splitList(form.sectors),
        countries_activity: splitList(form.countries_with_activities),
        countries_suppliers: splitList(form.countries_with_suppliers),
      };
      const { error: updateError } = await supabase
        .from("organisations")
        .update({
          name: form.name.trim(),
          organization_type: form.organization_type || null,
          legal_type: form.legal_type || null,
          address: form.address || null,
          city: form.city || null,
          country: form.country || null,
          website: form.website || null,
          company_code: form.company_code || null,
          employees_number: toNumberOrNull(form.employees_number),
          sectors: splitList(form.sectors),
          countries_with_activities: splitList(form.countries_with_activities),
          countries_with_suppliers: splitList(form.countries_with_suppliers),
          logo: form.logo_url || null,
          contact_info: JSON.stringify(nextContactInfo),
        })
        .eq("organization_id", context.organizationId);

      if (updateError) throw updateError;
      setSuccess("Organisation profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update organisation.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title="Company Information" description="Update organisation profile and operations footprint.">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-slate-500">Name</label>
          <input
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Organisation type</label>
          <select
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={form.organization_type}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, organization_type: event.target.value }))
            }
          >
            <option value="">Select</option>
            <option value="company">Company</option>
            <option value="supplier">Supplier</option>
            <option value="ngo">NGO</option>
            <option value="regulatory">Regulatory</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Legal type</label>
          <input
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={form.legal_type}
            onChange={(event) => setForm((prev) => ({ ...prev, legal_type: event.target.value }))}
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
            value={form.city}
            onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Website URL</label>
          <input
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="https://"
            value={form.website}
            onChange={(event) => setForm((prev) => ({ ...prev, website: event.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Company code</label>
          <input
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={form.company_code}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, company_code: event.target.value }))
            }
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Employee number</label>
          <input
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={form.employees_number}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, employees_number: event.target.value }))
            }
            inputMode="numeric"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-semibold text-slate-500">Sectors</label>
          <input
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder={sectorSuggestions.length ? sectorSuggestions.slice(0, 3).join(", ") : ""}
            value={form.sectors}
            onChange={(event) => setForm((prev) => ({ ...prev, sectors: event.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Countries with activity</label>
          <input
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={form.countries_with_activities}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, countries_with_activities: event.target.value }))
            }
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Countries with suppliers</label>
          <input
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={form.countries_with_suppliers}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, countries_with_suppliers: event.target.value }))
            }
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-semibold text-slate-500">Logo</label>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <input
              type="file"
              accept="image/*"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                try {
                  const url = await uploadLogo(file);
                  setForm((prev) => ({ ...prev, logo_url: url }));
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Unable to upload logo.");
                }
              }}
            />
            <input
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Logo URL"
              value={form.logo_url}
              onChange={(event) => setForm((prev) => ({ ...prev, logo_url: event.target.value }))}
            />
          </div>
        </div>
      </div>
      <button
        className="mt-6 w-full rounded-full bg-[var(--wb-cobalt)] px-6 py-2 text-xs font-semibold text-white"
        onClick={handleSave}
        disabled={saving}
      >
        Update
      </button>
      {error ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">
          {success}
        </p>
      ) : null}
    </SectionCard>
  );
}
