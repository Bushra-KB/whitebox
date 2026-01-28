"use client";

import { useEffect, useMemo, useState } from "react";
import EmptyState from "@/components/portal/EmptyState";
import SectionCard from "@/components/portal/SectionCard";
import { supabase } from "@/lib/supabase/client";
import { loadOrgContext } from "@/lib/orgContext";

type RiskRow = {
  category_id: number;
  sub_category_id: number | null;
  report_categories: { name: string } | null;
  report_sub_categories: { name: string } | null;
};

type IssueGroup = {
  key: string;
  category: string;
  subCategory: string | null;
  count: number;
};

export default function IssuesPage() {
  const [riskRows, setRiskRows] = useState<RiskRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadIssues = async () => {
      try {
        const context = await loadOrgContext();
        const { data: reportRows } = await supabase
          .from("reports")
          .select("report_id")
          .eq("reported_org_id", context.organizationId);

        const reportIds = reportRows?.map((row) => row.report_id) ?? [];
        if (!reportIds.length) {
          setRiskRows([]);
          return;
        }

        const { data: riskData, error: riskError } = await supabase
          .from("report_risk_categories")
          .select("category_id,sub_category_id,report_categories(name),report_sub_categories(name)")
          .in("report_id", reportIds);

        if (riskError) throw new Error(riskError.message);
        if (!isMounted) return;
        setRiskRows(riskData ?? []);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unable to load issues.");
      }
    };
    loadIssues();
    return () => {
      isMounted = false;
    };
  }, []);

  const issues = useMemo(() => {
    const map = new Map<string, IssueGroup>();
    riskRows.forEach((row) => {
      const category = row.report_categories?.name ?? "Uncategorized";
      const subCategory = row.report_sub_categories?.name ?? null;
      const key = `${category}::${subCategory ?? "-"}`;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, { key, category, subCategory, count: 1 });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [riskRows]);

  return (
    <SectionCard
      title="Issues"
      description="Group incoming grievances by category and escalation signals."
      actions={
        <span className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600">
          {issues.length} tracked
        </span>
      }
    >
      {issues.length ? (
        <div className="space-y-3">
          {issues.map((issue) => (
            <div
              key={issue.key}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">{issue.category}</p>
                <p className="text-xs text-slate-500">
                  {issue.subCategory ? `Subcategory: ${issue.subCategory}` : "No subcategory"}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {issue.count} reports
              </span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No issues yet"
          description="Once reports are categorized, issue clusters will appear here."
        />
      )}
      {error ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      ) : null}
    </SectionCard>
  );
}
