"use client";

import { useEffect, useState } from "react";
import SectionCard from "@/components/portal/SectionCard";
import { supabase } from "@/lib/supabase/client";
import { loadOrgContext } from "@/lib/orgContext";
import { toNumberOrNull } from "@/lib/validation";

export default function OrganisationDeadlinesPage() {
  const [form, setForm] = useState({
    report_opened_deadline: "",
    report_waiting_deadline: "",
    report_waiting_filter_deadline: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadDeadlines = async () => {
      try {
        const context = await loadOrgContext();
        const { data: orgRow } = await supabase
          .from("organisations")
          .select(
            "report_opened_deadline,report_waiting_deadline,report_waiting_filter_deadline"
          )
          .eq("organization_id", context.organizationId)
          .maybeSingle();
        if (!isMounted) return;
        setForm({
          report_opened_deadline: orgRow?.report_opened_deadline?.toString() ?? "",
          report_waiting_deadline: orgRow?.report_waiting_deadline?.toString() ?? "",
          report_waiting_filter_deadline: orgRow?.report_waiting_filter_deadline?.toString() ?? "",
        });
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unable to load deadlines.");
      }
    };
    loadDeadlines();
    return () => {
      isMounted = false;
    };
  }, []);

  const saveDeadlines = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const context = await loadOrgContext();
      const { error: updateError } = await supabase
        .from("organisations")
        .update({
          report_opened_deadline: toNumberOrNull(form.report_opened_deadline) ?? 0,
          report_waiting_deadline: toNumberOrNull(form.report_waiting_deadline) ?? 0,
          report_waiting_filter_deadline: toNumberOrNull(form.report_waiting_filter_deadline) ?? 0,
        })
        .eq("organization_id", context.organizationId);
      if (updateError) throw updateError;
      setSuccess("Deadlines updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update deadlines.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title="Deadlines" description="Set organisation-level SLA reminders by report stage.">
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Opened", key: "report_opened_deadline" },
          { label: "Waiting", key: "report_waiting_deadline" },
          { label: "Filter", key: "report_waiting_filter_deadline" },
        ].map((item) => (
          <div key={item.key} className="rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-500">{item.label}</p>
            <input
              className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Days"
              value={form[item.key as keyof typeof form]}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, [item.key]: event.target.value }))
              }
              inputMode="numeric"
            />
          </div>
        ))}
      </div>
      <button
        className="mt-6 rounded-full bg-[var(--wb-cobalt)] px-5 py-2 text-xs font-semibold text-white"
        onClick={saveDeadlines}
        disabled={saving}
      >
        Save deadlines
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
