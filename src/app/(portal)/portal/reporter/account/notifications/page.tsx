"use client";

import { useEffect, useState } from "react";
import SectionCard from "@/components/portal/SectionCard";
import { supabase } from "@/lib/supabase/client";

const rows = [
  { key: "report_status_updated", label: "Report status updated" },
  { key: "new_comment_received", label: "New comment received" },
  { key: "action_feedback_requested", label: "Action feedback requested" },
];

export default function ReporterNotificationsPage() {
  const [prefs, setPrefs] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadPrefs = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const authUserId = authData.user?.id;
      if (!authUserId) {
        setError("Please log in to manage notifications.");
        return;
      }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("notification_preferences")
        .eq("auth_user_id", authUserId)
        .maybeSingle();

      if (!isMounted) return;
      const existing = (profile?.notification_preferences as Record<string, unknown>) || {};
      const nextPrefs: Record<string, string> = { ...existing } as Record<string, string>;
      rows.forEach((row) => {
        const value = existing[row.key];
        nextPrefs[row.key] = typeof value === "string" ? value : "off";
      });
      setPrefs(nextPrefs);
    };

    loadPrefs();

    return () => {
      isMounted = false;
    };
  }, []);

  const updatePreference = async (key: string, value: string) => {
    setIsSaving(true);
    setError(null);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const authUserId = authData.user?.id;
      if (!authUserId) throw new Error("Please log in to update notifications.");
      const nextPrefs = { ...prefs, [key]: value };
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({ notification_preferences: nextPrefs })
        .eq("auth_user_id", authUserId);
      if (updateError) throw updateError;
      setPrefs(nextPrefs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update notifications.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SectionCard title="Alert & Notification Settings" description="Control how you receive report updates.">
      <div className="space-y-4">
        {rows.map((row) => (
          <div key={row.key} className="grid items-center gap-4 border-b border-slate-100 pb-4 md:grid-cols-[1.6fr_2fr]">
            <p className="text-sm font-semibold text-slate-700">{row.label}</p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name={row.key}
                  checked={prefs[row.key] === "off"}
                  onChange={() => updatePreference(row.key, "off")}
                  disabled={isSaving}
                />{" "}
                Off
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name={row.key}
                  checked={prefs[row.key] === "in_app"}
                  onChange={() => updatePreference(row.key, "in_app")}
                  disabled={isSaving}
                />{" "}
                In-app only
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name={row.key}
                  checked={prefs[row.key] === "email"}
                  onChange={() => updatePreference(row.key, "email")}
                  disabled={isSaving}
                />{" "}
                Email
              </label>
            </div>
          </div>
        ))}
      </div>
      {error ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      ) : null}
    </SectionCard>
  );
}
