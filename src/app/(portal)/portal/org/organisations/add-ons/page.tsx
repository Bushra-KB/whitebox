"use client";

import { useEffect, useState } from "react";
import SectionCard from "@/components/portal/SectionCard";
import { supabase } from "@/lib/supabase/client";
import { loadOrgContext } from "@/lib/orgContext";

const addons = [
  {
    key: "whistleblower",
    name: "Whistleblower",
    description: "Dedicated whistleblowing intake and compliance tooling.",
    price: "€9 / month",
  },
  {
    key: "statistics",
    name: "Statistics",
    description: "Advanced analytics and export-ready dashboards.",
    price: "€38 / month",
  },
  {
    key: "compliance",
    name: "Compliance",
    description: "Regulatory reporting packs and audit exports.",
    price: "€85 / yearly",
  },
];

export default function OrganisationAddOnsPage() {
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadAddons = async () => {
      try {
        const context = await loadOrgContext();
        const { data: orgRow } = await supabase
          .from("organisations")
          .select("contact_info")
          .eq("organization_id", context.organizationId)
          .maybeSingle();
        let contactInfo: Record<string, unknown> = {};
        if (orgRow?.contact_info) {
          try {
            contactInfo = JSON.parse(orgRow.contact_info);
          } catch {
            contactInfo = {};
          }
        }
        const stored = Array.isArray(contactInfo.addons) ? contactInfo.addons : [];
        if (!isMounted) return;
        setSelected(stored.filter(Boolean));
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unable to load add-ons.");
      }
    };
    loadAddons();
    return () => {
      isMounted = false;
    };
  }, []);

  const persistAddons = async (next: string[]) => {
    setSaving(true);
    setError(null);
    try {
      const context = await loadOrgContext();
      const { data: orgRow } = await supabase
        .from("organisations")
        .select("contact_info")
        .eq("organization_id", context.organizationId)
        .maybeSingle();
      let contactInfo: Record<string, unknown> = {};
      if (orgRow?.contact_info) {
        try {
          contactInfo = JSON.parse(orgRow.contact_info);
        } catch {
          contactInfo = {};
        }
      }
      const updated = { ...contactInfo, addons: next };
      const { error: updateError } = await supabase
        .from("organisations")
        .update({ contact_info: JSON.stringify(updated) })
        .eq("organization_id", context.organizationId);
      if (updateError) throw updateError;
      setSelected(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update add-ons.");
    } finally {
      setSaving(false);
    }
  };

  const toggleAddon = async (key: string) => {
    const isSelected = selected.includes(key);
    const next = isSelected ? selected.filter((item) => item !== key) : [...selected, key];
    await persistAddons(next);
  };

  return (
    <SectionCard title="Add-ons" description="Extend the platform with additional compliance services.">
      <div className="space-y-4">
        {addons.map((addon) => {
          const isSelected = selected.includes(addon.key);
          return (
            <div
              key={addon.key}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">{addon.name}</p>
                <p className="text-xs text-slate-500">{addon.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-600">{addon.price}</span>
                <button
                  className={`rounded-full px-4 py-2 text-xs font-semibold text-white ${
                    isSelected ? "bg-emerald-500" : "bg-[var(--wb-cobalt)]"
                  }`}
                  onClick={() => toggleAddon(addon.key)}
                  disabled={saving}
                >
                  {isSelected ? "Added" : "Add"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
        Subscriptions are invoiced annually. Add-ons can be enabled without interrupting current workflows.
      </div>
      {error ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      ) : null}
    </SectionCard>
  );
}
