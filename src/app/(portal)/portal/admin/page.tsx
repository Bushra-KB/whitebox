"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import SectionCard from "@/components/portal/SectionCard";
import StatCard from "@/components/portal/StatCard";
import { adminInvoke } from "@/lib/adminApi";

type AdminAlertSeverity = "high" | "medium" | "low";

type AdminAlertItem = {
  id: string;
  kind: "spam_report" | "pending_organisation" | "overdue_action" | "low_feedback";
  severity: AdminAlertSeverity;
  title: string;
  subtitle: string | null;
  occurred_at: string | null;
  link_path: string;
  link_label: string;
  meta: string | null;
};

type AdminAlertSummary = {
  spamReports: number;
  pendingOrganisations: number;
  overdueActions: number;
  lowFeedback: number;
};

const ALERT_KIND_META: Record<
  AdminAlertItem["kind"],
  { label: string; badgeClass: string }
> = {
  spam_report: {
    label: "Spam",
    badgeClass: "bg-rose-50 text-rose-700",
  },
  pending_organisation: {
    label: "Organisation",
    badgeClass: "bg-amber-50 text-amber-700",
  },
  overdue_action: {
    label: "Action",
    badgeClass: "bg-fuchsia-50 text-fuchsia-700",
  },
  low_feedback: {
    label: "Feedback",
    badgeClass: "bg-sky-50 text-sky-700",
  },
};

const ALERT_SEVERITY_OPTIONS: Array<"all" | AdminAlertSeverity> = [
  "all",
  "high",
  "medium",
  "low",
];

const ALERT_KIND_OPTIONS: Array<"all" | AdminAlertItem["kind"]> = [
  "all",
  "spam_report",
  "pending_organisation",
  "overdue_action",
  "low_feedback",
];

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalReports: 0,
    waitingFilter: 0,
    investigating: 0,
    remediation: 0,
    archivedReports: 0,
    spamReports: 0,
  });
  const [adminAlerts, setAdminAlerts] = useState<{
    summary: AdminAlertSummary;
    items: AdminAlertItem[];
  }>({
    summary: {
      spamReports: 0,
      pendingOrganisations: 0,
      overdueActions: 0,
      lowFeedback: 0,
    },
    items: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<"all" | AdminAlertSeverity>("all");
  const [kindFilter, setKindFilter] = useState<"all" | AdminAlertItem["kind"]>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const loadDashboard = useCallback(async () => {
    setAlertsLoading(true);
    setError(null);
    try {
      const [dashboardData, alertData] = await Promise.all([
        adminInvoke<{
          totalReports: number;
          waitingFilter: number;
          investigating: number;
          remediation: number;
          archivedReports: number;
          spamReports: number;
        }>("dashboard"),
        adminInvoke<{
          summary: AdminAlertSummary;
          items: AdminAlertItem[];
        }>("adminAlerts"),
      ]);

      setStats({
        totalReports: dashboardData.totalReports ?? 0,
        waitingFilter: dashboardData.waitingFilter ?? 0,
        investigating: dashboardData.investigating ?? 0,
        remediation: dashboardData.remediation ?? 0,
        archivedReports: dashboardData.archivedReports ?? 0,
        spamReports: dashboardData.spamReports ?? 0,
      });
      setAdminAlerts({
        summary: {
          spamReports: alertData.summary?.spamReports ?? 0,
          pendingOrganisations: alertData.summary?.pendingOrganisations ?? 0,
          overdueActions: alertData.summary?.overdueActions ?? 0,
          lowFeedback: alertData.summary?.lowFeedback ?? 0,
        },
        items: alertData.items ?? [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load dashboard.");
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const alerts = useMemo(
    () => [
      { title: "Total reports", value: stats.totalReports.toString(), note: "All statuses" },
      { title: "Waiting filter", value: stats.waitingFilter.toString(), note: "Pending review" },
      { title: "Archived", value: stats.archivedReports.toString(), note: "Archived reports" },
      { title: "Spam", value: stats.spamReports.toString(), note: "Flagged spam" },
    ],
    [stats]
  );

  const distribution = useMemo(
    () => [
      {
        key: "waiting",
        label: "Waiting",
        value: stats.waitingFilter,
        colorClass: "bg-amber-400",
      },
      {
        key: "investigating",
        label: "Investigation",
        value: stats.investigating,
        colorClass: "bg-sky-500",
      },
      {
        key: "remediation",
        label: "Remediation",
        value: stats.remediation,
        colorClass: "bg-indigo-500",
      },
      {
        key: "archived",
        label: "Archived",
        value: stats.archivedReports,
        colorClass: "bg-slate-500",
      },
      {
        key: "spam",
        label: "Spam",
        value: stats.spamReports,
        colorClass: "bg-rose-500",
      },
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

  const severityCounts = useMemo(
    () => ({
      all: adminAlerts.items.length,
      high: adminAlerts.items.filter((item) => item.severity === "high").length,
      medium: adminAlerts.items.filter((item) => item.severity === "medium").length,
      low: adminAlerts.items.filter((item) => item.severity === "low").length,
    }),
    [adminAlerts.items]
  );

  const filteredAlerts = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return adminAlerts.items.filter((item) => {
      if (severityFilter !== "all" && item.severity !== severityFilter) return false;
      if (kindFilter !== "all" && item.kind !== kindFilter) return false;
      if (!search) return true;
      const haystack = [item.title, item.subtitle, item.meta, ALERT_KIND_META[item.kind].label]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(search);
    });
  }, [adminAlerts.items, kindFilter, searchTerm, severityFilter]);

  const filteredCountLabel =
    filteredAlerts.length === adminAlerts.items.length
      ? `${filteredAlerts.length} alerts`
      : `${filteredAlerts.length} of ${adminAlerts.items.length} alerts`;

  const hasActiveFilters =
    severityFilter !== "all" || kindFilter !== "all" || searchTerm.trim().length > 0;

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">System Overview</p>
        <h2 className="mt-2 font-display text-3xl text-slate-900">Dashboard</h2>
        <p className="mt-2 text-sm text-slate-600">View WhiteBox operational metrics across tenants.</p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {alerts.map((item) => (
          <StatCard key={item.title} title={item.title} value={item.value} trend={item.note} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <SectionCard title="Queue health" description="Monitor status distribution and SLA risk."
          actions={<button className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600">Export</button>}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Waiting filter", value: stats.waitingFilter.toString() },
              { label: "In investigation", value: stats.investigating.toString() },
              { label: "Remediation", value: stats.remediation.toString() },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-400">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800">Status distribution</p>
              <p className="text-xs text-slate-500">
                {totalDistribution} tracked items
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-5">
              {distribution.map((item) => {
                const share = totalDistribution > 0 ? (item.value / totalDistribution) * 100 : 0;
                const barHeight = (item.value / maxDistribution) * 100;
                return (
                  <div key={item.key} className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500">
                      {item.label}
                    </p>
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

        <SectionCard
          title="Admin alerts"
          description="Prioritized, cross-tenant issues for immediate intervention."
          actions={
            <>
              <button
                type="button"
                onClick={() => void loadDashboard()}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={alertsLoading}
              >
                {alertsLoading ? "Refreshing..." : "Refresh"}
              </button>
              <Link
                href="/portal/admin/reports"
                className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100"
              >
                Open reports
              </Link>
            </>
          }
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.08em] text-rose-600">Spam queue</p>
              <p className="mt-1 text-lg font-semibold text-rose-700">
                {adminAlerts.summary.spamReports}
              </p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.08em] text-amber-600">
                Pending organisations
              </p>
              <p className="mt-1 text-lg font-semibold text-amber-700">
                {adminAlerts.summary.pendingOrganisations}
              </p>
            </div>
            <div className="rounded-xl border border-fuchsia-100 bg-fuchsia-50 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.08em] text-fuchsia-600">
                Overdue actions
              </p>
              <p className="mt-1 text-lg font-semibold text-fuchsia-700">
                {adminAlerts.summary.overdueActions}
              </p>
            </div>
            <div className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.08em] text-sky-600">Low feedback</p>
              <p className="mt-1 text-lg font-semibold text-sky-700">
                {adminAlerts.summary.lowFeedback}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                {ALERT_SEVERITY_OPTIONS.map((option) => {
                  const active = severityFilter === option;
                  const label = option === "all" ? "All" : option.charAt(0).toUpperCase() + option.slice(1);
                  const count = severityCounts[option];
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSeverityFilter(option)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        active
                          ? "bg-slate-900 text-white"
                          : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                      }`}
                    >
                      {label} ({count})
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500">{filteredCountLabel}</p>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <label className="sr-only" htmlFor="admin-alert-kind">
                Alert type
              </label>
              <select
                id="admin-alert-kind"
                value={kindFilter}
                onChange={(event) => setKindFilter(event.target.value as typeof kindFilter)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none"
              >
                {ALERT_KIND_OPTIONS.map((option) => {
                  if (option === "all") return <option key={option} value={option}>All alert types</option>;
                  return (
                    <option key={option} value={option}>
                      {ALERT_KIND_META[option].label}
                    </option>
                  );
                })}
              </select>

              <label className="sr-only" htmlFor="admin-alert-search">
                Search alerts
              </label>
              <input
                id="admin-alert-search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search title, report, meta..."
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none"
              />

              <button
                type="button"
                onClick={() => {
                  setSeverityFilter("all");
                  setKindFilter("all");
                  setSearchTerm("");
                }}
                disabled={!hasActiveFilters}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear filters
              </button>
            </div>
          </div>

          <div className="relative mt-4 max-h-[460px] overflow-y-auto pr-1">
            <div className="space-y-3 pl-6 before:absolute before:bottom-2 before:left-2 before:top-2 before:w-px before:bg-slate-200">
              {alertsLoading ? (
                <p className="rounded-xl border border-slate-200 bg-white px-3 py-4 text-sm text-slate-500">
                  Loading alerts...
                </p>
              ) : filteredAlerts.length ? (
                filteredAlerts.map((item) => {
                  const dotClass =
                    item.severity === "high"
                      ? "bg-rose-500"
                      : item.severity === "medium"
                        ? "bg-amber-500"
                        : "bg-indigo-500";
                  const severityLabel =
                    item.severity === "high"
                      ? "High"
                      : item.severity === "medium"
                        ? "Medium"
                        : "Low";

                  return (
                    <Link
                      key={item.id}
                      href={item.link_path}
                      className="relative block rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow"
                    >
                      <span
                        className={`absolute -left-[21px] top-4 h-3 w-3 rounded-full border-2 border-white ${dotClass}`}
                      />
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <p className="text-[11px] text-slate-500">{formatDateTime(item.occurred_at)}</p>
                          <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                          {item.subtitle ? (
                            <p className="line-clamp-2 text-xs text-slate-600">{item.subtitle}</p>
                          ) : null}
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                                ALERT_KIND_META[item.kind].badgeClass
                              }`}
                            >
                              {ALERT_KIND_META[item.kind].label}
                            </span>
                            {item.meta ? (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                                {item.meta}
                              </span>
                            ) : null}
                            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                              {item.link_label}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            item.severity === "high"
                              ? "bg-rose-50 text-rose-700"
                              : item.severity === "medium"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {severityLabel}
                        </span>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                  {hasActiveFilters ? "No alerts match current filters." : "No alerts right now."}
                </p>
              )}
            </div>
          </div>
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
