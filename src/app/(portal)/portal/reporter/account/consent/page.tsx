"use client";

import { useEffect, useMemo, useState } from "react";
import EmptyState from "@/components/portal/EmptyState";
import SectionCard from "@/components/portal/SectionCard";
import StatCard from "@/components/portal/StatCard";
import { supabase } from "@/lib/supabase/client";

type ConsentRow = {
  consent_id: number;
  policy_id: number;
  accepted_version: number;
  accepted_at: string | null;
  is_revoked: boolean | null;
};

type PolicyRow = {
  policy_id: number;
  title: string;
  policy_type: string;
};

export default function ReporterConsentPage() {
  const [rows, setRows] = useState<ConsentRow[]>([]);
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadConsents = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const authUserId = authData.user?.id;
      if (!authUserId) {
        setError("Please log in to view consent history.");
        return;
      }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("user_id")
        .eq("auth_user_id", authUserId)
        .maybeSingle();
      if (!profile?.user_id) {
        setError("Reporter profile not found.");
        return;
      }

      const { data: consentRows, error: consentError } = await supabase
        .from("user_policy_consents")
        .select("consent_id,policy_id,accepted_version,accepted_at,is_revoked")
        .eq("user_id", profile.user_id)
        .order("accepted_at", { ascending: false });

      if (!isMounted) return;
      if (consentError) {
        setError(consentError.message);
        return;
      }

      const policyIds = Array.from(
        new Set((consentRows ?? []).map((row) => row.policy_id))
      );
      const { data: policyRows } = policyIds.length
        ? await supabase
            .from("policies")
            .select("policy_id,title,policy_type")
            .in("policy_id", policyIds)
        : { data: [] };

      if (!isMounted) return;
      setRows(consentRows ?? []);
      setPolicies(policyRows ?? []);
    };

    loadConsents();

    return () => {
      isMounted = false;
    };
  }, []);

  const policyTitleById = useMemo(
    () => Object.fromEntries(policies.map((policy) => [policy.policy_id, policy.title])),
    [policies]
  );

  const stats = useMemo(() => {
    const total = rows.length;
    const revoked = rows.filter((row) => row.is_revoked).length;
    const active = total - revoked;
    return { total, active, revoked };
  }, [rows]);

  return (
    <SectionCard
      title="Consent & Policy Management"
      description="Review the policies you have accepted and manage consent history."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Consents" value={stats.total.toString()} />
        <StatCard title="Up to Date" value={stats.active.toString()} />
        <StatCard title="Pending Review" value="0" />
        <StatCard title="Revoked" value={stats.revoked.toString()} />
      </div>

      <div className="mt-6">
        {rows.length ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">Policy</th>
                  <th className="px-4 py-3">Version</th>
                  <th className="px-4 py-3">Accepted</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.consent_id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {policyTitleById[row.policy_id] || `Policy ${row.policy_id}`}
                    </td>
                    <td className="px-4 py-3">v{row.accepted_version}</td>
                    <td className="px-4 py-3">
                      {row.accepted_at ? new Date(row.accepted_at).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-4 py-3">{row.is_revoked ? "Revoked" : "Active"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No consent changes"
            description="Your consent history will appear here when policies are updated."
          />
        )}
      </div>
      {error ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      ) : null}
    </SectionCard>
  );
}
