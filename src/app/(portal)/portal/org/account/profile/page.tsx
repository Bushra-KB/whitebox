"use client";

import { useEffect, useState } from "react";
import SectionCard from "@/components/portal/SectionCard";
import { supabase } from "@/lib/supabase/client";
import { loadOrgContext } from "@/lib/orgContext";

type CountryOption = { id: string; name: string };

export default function AccountProfilePage() {
  const [profile, setProfile] = useState({
    first_name: "",
    last_name: "",
    display_name: "",
    email: "",
    phone: "",
    location: "",
    profile_picture_url: "",
    department: "",
    job_title: "",
    role: "",
  });
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      try {
        const context = await loadOrgContext();
        const { data: countryRows } = await supabase
          .from("countries")
          .select("country_id,country_name")
          .order("country_name");

        if (!isMounted) return;
        setProfile({
          first_name: context.profile.firstName,
          last_name: context.profile.lastName,
          display_name: context.profile.displayName,
          email: context.profile.email,
          phone: context.profile.phone,
          location: context.profile.location,
          profile_picture_url: context.profile.avatarUrl,
          department: context.orgUser?.department ?? "",
          job_title: context.orgUser?.jobTitle ?? "",
          role: context.roleName ?? "Organisation",
        });
        setCountries(
          countryRows?.map((row) => ({ id: String(row.country_id), name: row.country_name })) ?? []
        );
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unable to load profile.");
      }
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  const saveProfile = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const context = await loadOrgContext();
      const { error: profileError } = await supabase
        .from("user_profiles")
        .update({
          first_name: profile.first_name || null,
          last_name: profile.last_name || null,
          display_name: profile.display_name || null,
          phone: profile.phone || null,
          location: profile.location || null,
          profile_picture_url: profile.profile_picture_url || null,
        })
        .eq("auth_user_id", context.authUserId);

      if (profileError) throw profileError;

      if (context.orgUser) {
        const { error: orgUserError } = await supabase
          .from("organization_users")
          .update({
            department: profile.department || null,
            job_title: profile.job_title || null,
          })
          .eq("user_id", context.userId)
          .eq("organization_id", context.organizationId);

        if (orgUserError) throw orgUserError;
      }

      setSuccess("Profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SectionCard title="Account and Security" description="Update your profile and portal preferences.">
      <div className="grid gap-6 md:grid-cols-[200px_1fr]">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-slate-100 text-xs text-slate-400">
            Avatar
          </div>
          <input
            className="w-full rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600"
            placeholder="Avatar URL"
            value={profile.profile_picture_url}
            onChange={(event) =>
              setProfile((prev) => ({ ...prev, profile_picture_url: event.target.value }))
            }
          />
        </div>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-500">First name</label>
              <input
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={profile.first_name}
                onChange={(event) =>
                  setProfile((prev) => ({ ...prev, first_name: event.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Last name</label>
              <input
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={profile.last_name}
                onChange={(event) =>
                  setProfile((prev) => ({ ...prev, last_name: event.target.value }))
                }
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-500">Display name</label>
              <input
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={profile.display_name}
                onChange={(event) =>
                  setProfile((prev) => ({ ...prev, display_name: event.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Email</label>
              <input
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={profile.email}
                readOnly
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-500">Phone</label>
              <input
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={profile.phone}
                onChange={(event) => setProfile((prev) => ({ ...prev, phone: event.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Country</label>
              <select
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={profile.location}
                onChange={(event) =>
                  setProfile((prev) => ({ ...prev, location: event.target.value }))
                }
              >
                <option value="">Select country</option>
                {countries.map((country) => (
                  <option key={country.id} value={country.name}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-500">Department</label>
              <input
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={profile.department}
                onChange={(event) =>
                  setProfile((prev) => ({ ...prev, department: event.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Job title</label>
              <input
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={profile.job_title}
                onChange={(event) =>
                  setProfile((prev) => ({ ...prev, job_title: event.target.value }))
                }
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-500">Role</label>
              <input
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={profile.role}
                readOnly
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="rounded-full bg-[var(--wb-cobalt)] px-5 py-2 text-xs font-semibold text-white"
              onClick={saveProfile}
              disabled={isSaving}
            >
              Save
            </button>
          </div>
          {error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">
              {success}
            </p>
          ) : null}
        </div>
      </div>
    </SectionCard>
  );
}
