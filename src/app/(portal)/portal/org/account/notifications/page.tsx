"use client";

import { useEffect, useState } from "react";
import SectionCard from "@/components/portal/SectionCard";
import { supabase } from "@/lib/supabase/client";
import { loadOrgContext } from "@/lib/orgContext";

const notificationRows = [
  { key: "new_report", label: "New Report Received" },
  { key: "report_status", label: "Report Status Updated" },
  { key: "new_comment", label: "New Comment Received" },
  { key: "new_action", label: "New Action Set" },
];

type NotificationPref = {
  is_enabled: boolean;
  delivery_method: "email" | "in_app";
};

export default function AccountNotificationsPage() {
  const [prefs, setPrefs] = useState<Record<string, NotificationPref>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadSettings = async () => {
      try {
        const context = await loadOrgContext();
        const { data: rows, error: loadError } = await supabase
          .from("organization_notification_settings")
          .select("notification_type,is_enabled,delivery_method")
          .eq("organization_id", context.organizationId);
        if (loadError) throw new Error(loadError.message);
        if (!isMounted) return;
        const nextPrefs: Record<string, NotificationPref> = {};
        rows?.forEach((row) => {
          nextPrefs[row.notification_type] = {
            is_enabled: row.is_enabled ?? false,
            delivery_method: row.delivery_method === "email" ? "email" : "in_app",
          };
        });
        setPrefs(nextPrefs);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unable to load notification settings.");
      }
    };
    loadSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  const updatePreference = async (key: string, value: NotificationPref | null) => {
    setSaving(true);
    setError(null);
    try {
      const context = await loadOrgContext();
      const payload = value
        ? {
            organization_id: context.organizationId,
            notification_type: key,
            is_enabled: value.is_enabled,
            delivery_method: value.delivery_method,
            frequency: "immediate",
          }
        : null;

      if (payload) {
        const { error: upsertError } = await supabase
          .from("organization_notification_settings")
          .upsert(payload, { onConflict: "organization_id,notification_type" });
        if (upsertError) throw upsertError;
      } else {
        const { error: deleteError } = await supabase
          .from("organization_notification_settings")
          .delete()
          .eq("organization_id", context.organizationId)
          .eq("notification_type", key);
        if (deleteError) throw deleteError;
      }

      setPrefs((prev) => {
        const next = { ...prev };
        if (value) {
          next[key] = value;
        } else {
          delete next[key];
        }
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update notifications.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title="Alert & Notification Settings" description="Control where and how updates are delivered.">
      <div className="space-y-4">
        {notificationRows.map((row) => {
          const current = prefs[row.key];
          return (
            <div
              key={row.key}
              className="grid items-center gap-4 border-b border-slate-100 pb-4 md:grid-cols-[1.6fr_2fr]"
            >
              <p className="text-sm font-semibold text-slate-700">{row.label}</p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={row.key}
                    checked={!current}
                    onChange={() => updatePreference(row.key, null)}
                    disabled={saving}
                  />
                  Off
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={row.key}
                    checked={!!current && current.delivery_method === "in_app"}
                    onChange={() =>
                      updatePreference(row.key, { is_enabled: true, delivery_method: "in_app" })
                    }
                    disabled={saving}
                  />
                  In-app only
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={row.key}
                    checked={!!current && current.delivery_method === "email"}
                    onChange={() =>
                      updatePreference(row.key, { is_enabled: true, delivery_method: "email" })
                    }
                    disabled={saving}
                  />
                  Email
                </label>
              </div>
            </div>
          );
        })}
      </div>
      {error ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      ) : null}
    </SectionCard>
  );
}
