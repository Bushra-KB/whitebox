"use client";

import { useEffect, useState } from "react";
import SectionCard from "@/components/portal/SectionCard";
import { supabase } from "@/lib/supabase/client";

type CountryOption = { id: string; name: string };

export default function ReporterProfilePage() {
  const [profile, setProfile] = useState({
    user_type: "",
    first_name: "",
    last_name: "",
    display_name: "",
    email: "",
    location: "",
  });
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const authUserId = authData.user?.id;
      if (!authUserId) {
        setError("Please log in to view your profile.");
        return;
      }

      const [{ data: profileRow, error: profileError }, { data: countryRows }] =
        await Promise.all([
          supabase
            .from("user_profiles")
            .select("user_type,first_name,last_name,display_name,email,location")
            .eq("auth_user_id", authUserId)
            .maybeSingle(),
          supabase.from("countries").select("country_id,country_name").order("country_name"),
        ]);

      if (!isMounted) return;
      if (profileError) {
        setError(profileError.message);
        return;
      }

      if (profileRow) {
        setProfile({
          user_type: profileRow.user_type ?? "",
          first_name: profileRow.first_name ?? "",
          last_name: profileRow.last_name ?? "",
          display_name: profileRow.display_name ?? "",
          email: profileRow.email ?? "",
          location: profileRow.location ?? "",
        });
      }

      const nextCountries =
        countryRows?.map((row) => ({
          id: String(row.country_id),
          name: row.country_name,
        })) ?? [];
      setCountries(nextCountries);
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const isAnonymous = profile.user_type === "anonymous";

  const saveProfile = async () => {
    if (isAnonymous) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const authUserId = authData.user?.id;
      if (!authUserId) throw new Error("Please log in to update your profile.");
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({
          first_name: profile.first_name || null,
          last_name: profile.last_name || null,
          display_name: profile.display_name || null,
          location: profile.location || null,
        })
        .eq("auth_user_id", authUserId);
      if (updateError) throw updateError;
      setSuccess("Profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {isAnonymous ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-700">
          <p className="font-semibold">Anonymous Account</p>
          <p className="mt-1">
            You are currently using an anonymous account:{" "}
            <span className="font-semibold">{profile.email || "anonymous"}</span>. Profile updates
            (full name, photo, etc.) are not available for anonymous users.
          </p>
        </div>
      ) : null}

      <SectionCard title="Profile" description="Manage your reporter profile details.">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-slate-500">Full name</label>
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={profile.display_name}
              onChange={(event) =>
                setProfile((prev) => ({ ...prev, display_name: event.target.value }))
              }
              disabled={isAnonymous}
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
          <div>
            <label className="text-xs font-semibold text-slate-500">Country</label>
            <select
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={profile.location}
              onChange={(event) =>
                setProfile((prev) => ({ ...prev, location: event.target.value }))
              }
              disabled={isAnonymous}
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
            <label className="text-xs font-semibold text-slate-500">Preferred language</label>
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Coming soon"
              disabled
            />
          </div>
        </div>
        {!isAnonymous ? (
          <button
            type="button"
            className="mt-6 rounded-full bg-[var(--wb-cobalt)] px-5 py-2 text-xs font-semibold text-white"
            onClick={saveProfile}
            disabled={isSaving}
          >
            Save changes
          </button>
        ) : null}
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
    </div>
  );
}
