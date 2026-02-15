"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import SectionCard from "@/components/portal/SectionCard";
import StatCard from "@/components/portal/StatCard";
import { supabase } from "@/lib/supabase/client";
import { loadOrgContext } from "@/lib/orgContext";

type ReportRow = {
  report_id: number;
  report_code: string;
  title: string;
  status: string | null;
  status_id?: number | null;
  status_code?: string | null;
  status_label?: string | null;
  report_statuses?: { code: string; label: string } | null;
  is_spam: boolean | null;
  created_at: string | null;
};

type ActionRow = {
  action_id: number;
  report_id: number;
  action_description: string;
  status: string | null;
  due_date: string | null;
  created_at: string | null;
};

type CommentRow = {
  comment_id: number;
  report_id: number;
  comment_text: string;
  created_at: string | null;
};

type TimelineItem = {
  key: string;
  kind: "action" | "comment";
  title: string;
  body: string | null;
  created_at: string | null;
  report_code: string | null;
  due_text: string | null;
  urgency: "high" | "medium" | "low";
};

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function getDueText(dueDate: string | null) {
  if (!dueDate) return "No due date";
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return "No due date";

  const now = new Date();
  const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueStart = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.round((dueStart.getTime() - nowStart.getTime()) / 86400000);

  if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"}`;
  if (diffDays === 0) return "Due today";
  return `Due in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
}

function getUrgency(dueDate: string | null): "high" | "medium" | "low" {
  if (!dueDate) return "low";
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return "low";

  const now = new Date();
  const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueStart = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.round((dueStart.getTime() - nowStart.getTime()) / 86400000);

  if (diffDays < 0) return "high";
  if (diffDays <= 2) return "medium";
  return "low";
}

export default function PortalDashboardPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const context = await loadOrgContext();
        const { data: reportRows, error: reportError } = await supabase
          .from("reports")
          .select("report_id,report_code,title,status,status_id,is_spam,created_at,report_statuses(code,label)")
          .eq("reported_org_id", context.organizationId)
          .order("created_at", { ascending: false });

        if (reportError) throw new Error(reportError.message);
        const reportIds = (reportRows ?? []).map((row) => row.report_id);

        const [{ data: actionRows }, { data: commentRows }] = await Promise.all([
          supabase
            .from("report_actions")
            .select("action_id,report_id,action_description,status,due_date,created_at")
            .eq("responsible_org_id", context.organizationId)
            .order("created_at", { ascending: false })
            .limit(6),
          reportIds.length
            ? supabase
                .from("report_comments")
                .select("comment_id,report_id,comment_text,created_at")
                .in("report_id", reportIds)
                .order("created_at", { ascending: false })
                .limit(6)
            : Promise.resolve({ data: [] }),
        ]);

        if (!isMounted) return;
        const mapped =
          reportRows?.map((row) => ({
            ...row,
            status_code: row.report_statuses?.code ?? row.status ?? null,
            status_label: row.report_statuses?.label ?? row.status ?? null,
          })) ?? [];
        setReports(mapped);
        setActions(actionRows ?? []);
        setComments(commentRows ?? []);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unable to load organisation data.");
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const inFilter = reports.filter(
      (row) => (row.status_code ?? row.status) === "pre_evaluation"
    ).length;
    const active = reports.filter(
      (row) =>
        row.status_code &&
        ["waiting_admitted", "open_in_progress", "investigation", "remediation"].includes(
          row.status_code
        )
    ).length;
    const archived = reports.filter((row) => (row.status_code ?? row.status) === "archived").length;
    const spam = reports.filter((row) => row.is_spam).length;
    const waiting = reports.filter((row) => (row.status_code ?? row.status) === "waiting_admitted")
      .length;
    const open = reports.filter((row) => (row.status_code ?? row.status) === "open_in_progress").length;
    const investigating = reports.filter(
      (row) => (row.status_code ?? row.status) === "investigation"
    ).length;
    const remediation = reports.filter((row) => (row.status_code ?? row.status) === "remediation")
      .length;
    return { inFilter, active, archived, spam, waiting, open, investigating, remediation };
  }, [reports]);

  const distribution = useMemo(
    () => [
      { key: "open", label: "Open", value: stats.open, colorClass: "bg-emerald-500" },
      { key: "waiting", label: "Waiting", value: stats.waiting, colorClass: "bg-amber-400" },
      { key: "investigating", label: "Investigation", value: stats.investigating, colorClass: "bg-sky-500" },
      { key: "remediation", label: "Remediation", value: stats.remediation, colorClass: "bg-indigo-500" },
      { key: "archived", label: "Archived", value: stats.archived, colorClass: "bg-slate-500" },
      { key: "spam", label: "Spam", value: stats.spam, colorClass: "bg-rose-500" },
    ],
    [stats]
  );

  const totalDistribution = useMemo(
    () => distribution.reduce((sum, item) => sum + item.value, 0),
    [distribution]
  );

  const maxDistribution = useMemo(
    () => Math.max(1, ...distribution.map((item) => item.value)),
    [distribution]
  );

  const reportCodeById = useMemo(
    () => new Map(reports.map((report) => [report.report_id, report.report_code])),
    [reports]
  );

  const urgentTimeline = useMemo<TimelineItem[]>(() => {
    const actionItems: TimelineItem[] = actions.map((action) => ({
      key: `action-${action.action_id}`,
      kind: "action",
      title: action.action_description || "Action updated",
      body: action.status ? `Status: ${action.status}` : null,
      created_at: action.created_at,
      report_code: reportCodeById.get(action.report_id) ?? null,
      due_text: getDueText(action.due_date),
      urgency: getUrgency(action.due_date),
    }));

    const commentItems: TimelineItem[] = comments.map((comment) => ({
      key: `comment-${comment.comment_id}`,
      kind: "comment",
      title: "Comment added",
      body: comment.comment_text || "-",
      created_at: comment.created_at,
      report_code: reportCodeById.get(comment.report_id) ?? null,
      due_text: null,
      urgency: "low",
    }));

    return [...actionItems, ...commentItems]
      .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
      .slice(0, 10);
  }, [actions, comments, reportCodeById]);

  const urgentSummary = useMemo(() => {
    const actionsOverdue = urgentTimeline.filter(
      (item) => item.kind === "action" && item.urgency === "high"
    ).length;
    const actionsDueSoon = urgentTimeline.filter(
      (item) => item.kind === "action" && item.urgency === "medium"
    ).length;
    const latestComments = urgentTimeline.filter((item) => item.kind === "comment").length;
    return { actionsOverdue, actionsDueSoon, latestComments };
  }, [urgentTimeline]);

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Overview</p>
        <h2 className="mt-2 font-display text-3xl text-slate-900">Dashboard</h2>
        <p className="mt-2 text-sm text-slate-600">
          Monitor the grievance pipeline across intake, action, and resolution. Adjust priorities
          based on risk and engagement trends.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="In Filter" value={stats.inFilter.toString()} trend="Review queue" />
        <StatCard title="Active Reports" value={stats.active.toString()} trend="Open cases" />
        <StatCard title="Archived" value={stats.archived.toString()} trend="Resolved cases" />
        <StatCard title="Spam" value={stats.spam.toString()} trend="Flagged" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <SectionCard
          title="Pipeline Momentum"
          description="Snapshot of report flow health and open stage allocations."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Open", value: stats.open.toString(), tone: "bg-emerald-50 text-emerald-700" },
              { label: "Waiting", value: stats.waiting.toString(), tone: "bg-amber-50 text-amber-700" },
              { label: "Remediation", value: stats.remediation.toString(), tone: "bg-rose-50 text-rose-700" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-100 p-4">
                <p className="text-xs text-slate-400">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{item.value}</p>
                <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-[11px] ${item.tone}`}>
                  Updated 2h ago
                </span>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center">
            <div className="flex flex-wrap items-center justify-between gap-2 text-left">
              <p className="text-sm font-semibold text-slate-800">Status distribution</p>
              <p className="text-xs text-slate-500">{totalDistribution} tracked items</p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {distribution.map((item) => {
                const share = totalDistribution > 0 ? (item.value / totalDistribution) * 100 : 0;
                const barHeight = (item.value / maxDistribution) * 100;
                return (
                  <div key={item.key} className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500">{item.label}</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{item.value}</p>
                    <p className="text-[11px] text-slate-500">{share.toFixed(1)}%</p>
                    <div className="mt-3 flex h-24 items-end rounded-lg bg-slate-100 p-1">
                      <div
                        className={`w-full rounded ${item.colorClass}`}
                        style={{ height: `${Math.max(8, barHeight)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Urgent Activity" description="Prioritized timeline for actions and comments.">
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.08em] text-rose-600">Overdue actions</p>
              <p className="mt-1 text-lg font-semibold text-rose-700">{urgentSummary.actionsOverdue}</p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.08em] text-amber-600">Due soon</p>
              <p className="mt-1 text-lg font-semibold text-amber-700">{urgentSummary.actionsDueSoon}</p>
            </div>
            <div className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.08em] text-sky-600">Recent comments</p>
              <p className="mt-1 text-lg font-semibold text-sky-700">{urgentSummary.latestComments}</p>
            </div>
          </div>

          <div className="relative mt-5 max-h-[520px] overflow-y-auto pr-1">
            <div className="space-y-3 pl-6 before:absolute before:bottom-2 before:left-2 before:top-2 before:w-px before:bg-slate-200">
            {urgentTimeline.length ? (
              urgentTimeline.map((item) => {
                const dotClass =
                  item.urgency === "high"
                    ? "bg-rose-500"
                    : item.urgency === "medium"
                    ? "bg-amber-500"
                    : "bg-indigo-500";
                const urgencyLabel =
                  item.urgency === "high"
                    ? "High"
                    : item.urgency === "medium"
                    ? "Medium"
                    : "Low";
                const cardContent = (
                  <>
                    <span
                      className={`absolute -left-[21px] top-4 h-3 w-3 rounded-full border-2 border-white ${dotClass}`}
                    />
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="text-[11px] text-slate-500">{formatDateTime(item.created_at)}</p>
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        {item.body ? (
                          <p className="line-clamp-2 text-xs text-slate-600">{item.body}</p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                              item.kind === "action"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-sky-50 text-sky-700"
                            }`}
                          >
                            {item.kind}
                          </span>
                          {item.report_code ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                              Report {item.report_code}
                            </span>
                          ) : null}
                          {item.due_text ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                              {item.due_text}
                            </span>
                          ) : null}
                          {item.report_code ? (
                            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                              Open report
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          item.urgency === "high"
                            ? "bg-rose-50 text-rose-700"
                            : item.urgency === "medium"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {urgencyLabel}
                      </span>
                    </div>
                  </>
                );

                if (!item.report_code) {
                  return (
                    <article
                      key={item.key}
                      className="relative rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                    >
                      {cardContent}
                    </article>
                  );
                }

                return (
                  <Link
                    key={item.key}
                    href={`/portal/org/reports?report=${encodeURIComponent(item.report_code)}`}
                    className="relative block rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow"
                  >
                    {cardContent}
                  </Link>
                );
              })
            ) : (
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                No recent activity yet.
              </p>
            )}
            </div>
          </div>

          <button className="mt-6 w-full rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600">
            View activity log
          </button>
        </SectionCard>
      </div>
      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
