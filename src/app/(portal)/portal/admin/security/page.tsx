"use client";

import { useEffect, useState } from "react";
import SectionCard from "@/components/portal/SectionCard";
import { adminInvoke } from "@/lib/adminApi";

type SettingRow = { key: string; value: unknown };

export default function AdminSecurityPage() {
  const [mfaRequired, setMfaRequired] = useState(false);
  const [incidentLogging, setIncidentLogging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    adminInvoke<{ settings: SettingRow[] }>("getPlatformSettings")
      .then((data) => {
        if (!isMounted) return;
        const map = new Map(data.settings.map((row) => [row.key, row.value]));
        setMfaRequired(Boolean(map.get("admin_mfa_required") ?? false));
        setIncidentLogging(Boolean(map.get("incident_logging") ?? false));
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unable to load security settings.");
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const saveSetting = async (key: string, value: unknown) => {
    setIsSaving(true);
    setError(null);
    try {
      await adminInvoke("updatePlatformSettings", { key, value });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update setting.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SectionCard title="Security" description="Platform-level security controls.">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-900">Admin MFA</p>
          <p className="mt-1 text-xs text-slate-500">Require MFA for all system admins.</p>
          <button
            type="button"
            className="mt-4 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
            onClick={() => {
              const next = !mfaRequired;
              setMfaRequired(next);
              saveSetting("admin_mfa_required", next);
            }}
            disabled={isSaving}
          >
            {mfaRequired ? "Enabled" : "Disabled"}
          </button>
        </div>
        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-900">Incident logging</p>
          <p className="mt-1 text-xs text-slate-500">Write auth audit logs to database.</p>
          <button
            type="button"
            className="mt-4 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
            onClick={() => {
              const next = !incidentLogging;
              setIncidentLogging(next);
              saveSetting("incident_logging", next);
            }}
            disabled={isSaving}
          >
            {incidentLogging ? "Enabled" : "Disabled"}
          </button>
        </div>
      </div>
      {error ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      ) : null}
    </SectionCard>
  );
}
