"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import EmptyState from "@/components/portal/EmptyState";
import Modal from "@/components/portal/Modal";
import SectionCard from "@/components/portal/SectionCard";
import { supabase } from "@/lib/supabase/client";

const tabs = ["Created", "Filter", "Active", "Spam", "Archived"] as const;
const statusOptions = [
  "pre_evaluation",
  "waiting_admitted",
  "open_in_progress",
  "investigation",
  "remediation",
  "archived",
] as const;

type ReportRow = {
  report_id: number;
  report_code: string;
  title: string;
  description: string;
  status: string | null;
  status_id?: number | null;
  status_code?: string | null;
  status_label?: string | null;
  current_filter_result_id?: number | null;
  filter_result_code?: string | null;
  filter_result_label?: string | null;
  report_statuses?: { code: string; label: string } | null;
  report_filter_results?: { code: string; label: string } | null;
  is_spam: boolean | null;
  created_at: string | null;
  assigned_department_id?: number | null;
  triage_workflow_id?: number | null;
  organization_departments?: { name: string } | null;
  triage_workflows?: { name: string } | null;
};

type ReportDetails = {
  report: ReportRow & {
    incident_date: string | null;
    incident_location: string | null;
    country: string | null;
    severity_level: number | null;
    suggested_remedy: string | null;
    legal_steps_taken: string | null;
    report_code?: string | null;
    title?: string | null;
    created_at?: string | null;
    original_language?: string | null;
    is_incident_is_continuing?: boolean | null;
    intake_payload?: Record<string, unknown> | null;
    assigned_department_id?: number | null;
    triage_workflow_id?: number | null;
    organization_departments?: { name: string } | null;
    triage_workflows?: { name: string } | null;
  };
};

type StatusHistoryRow = {
  id: number;
  report_id: number;
  status_id: number;
  comment_text?: string | null;
  changed_at?: string | null;
  report_statuses?: { code: string; label: string } | null;
};

type CommentRow = {
  comment_id: number;
  report_id: number;
  comment_text: string;
  created_at: string | null;
};

type ActionRow = {
  action_id: number;
  report_id: number;
  action_description: string;
  status: string | null;
  status_id?: number | null;
  status_code?: string | null;
  status_label?: string | null;
  due_date: string | null;
  created_at: string | null;
  report_action_statuses?: { code: string; label: string } | null;
};

export default function ReporterReportsPage() {
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>("Created");
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [details, setDetails] = useState<ReportDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsTab, setDetailsTab] = useState<"details" | "actions" | "activity">("details");
  const [attachmentLinks, setAttachmentLinks] = useState<
    { path: string; url: string }[]
  >([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryRow[]>([]);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [actions, setActions] = useState<ActionRow[]>([]);

  useEffect(() => {
    let isMounted = true;
    const loadReports = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const authUserId = authData.user?.id;
      if (!authUserId) {
        setError("Please log in to view your reports.");
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

      const { data: reportRows, error: reportError } = await supabase
        .from("reports")
        .select(
          "report_id,report_code,title,description,status,status_id,current_filter_result_id,is_spam,created_at,report_statuses(code,label),report_filter_results(code,label)"
        )
        .eq("reporter_user_id", profile.user_id)
        .order("created_at", { ascending: false });

      if (!isMounted) return;
      if (reportError) {
        setError(reportError.message);
        return;
      }
      const mapped =
        reportRows?.map((row) => ({
          ...row,
          status_code: row.report_statuses?.code ?? row.status ?? null,
          status_label: row.report_statuses?.label ?? row.status ?? null,
          filter_result_code: row.report_filter_results?.code ?? null,
          filter_result_label: row.report_filter_results?.label ?? null,
        })) ?? [];
      setRows(mapped);
    };

    loadReports();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredRows = useMemo(() => {
    switch (activeTab) {
      case "Filter":
        return rows.filter((row) => (row.status_code ?? row.status) === "pre_evaluation");
      case "Active":
        return rows.filter(
          (row) =>
            row.status_code &&
            ["waiting_admitted", "open_in_progress", "investigation", "remediation"].includes(
              row.status_code
            )
        );
      case "Spam":
        return rows.filter((row) => row.is_spam);
      case "Archived":
        return rows.filter((row) => (row.status_code ?? row.status) === "archived");
      case "Created":
      default:
        return rows;
    }
  }, [activeTab, rows]);

  const openDetails = async (reportId: number) => {
    setLoadingDetails(true);
    setError(null);
    try {
      const { data: reportRow, error: reportError } = await supabase
        .from("reports")
        .select(
          "report_id,report_code,title,description,status,status_id,current_filter_result_id,is_spam,created_at,incident_date,incident_location,country,severity_level,suggested_remedy,legal_steps_taken,original_language,is_incident_is_continuing,intake_payload,assigned_department_id,triage_workflow_id,report_statuses(code,label),report_filter_results(code,label),organization_departments(name),triage_workflows(name)"
        )
        .eq("report_id", reportId)
        .maybeSingle();
      if (reportError) throw new Error(reportError.message);
      if (!reportRow) throw new Error("Report not found.");
      const mapped = {
        ...reportRow,
        status_code: reportRow.report_statuses?.code ?? reportRow.status ?? null,
        status_label: reportRow.report_statuses?.label ?? reportRow.status ?? null,
        filter_result_code: reportRow.report_filter_results?.code ?? null,
        filter_result_label: reportRow.report_filter_results?.label ?? null,
      };
      setDetails({ report: mapped as ReportDetails["report"] });
      setDetailsTab("details");
      setViewOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load report details.");
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadAttachments = async () => {
      if (!details?.report) {
        setAttachmentLinks([]);
        return;
      }
      const intake = (details.report.intake_payload ?? {}) as Record<string, unknown>;
      const attachments = Array.isArray(intake.attachments) ? intake.attachments : [];
      if (!attachments.length) {
        setAttachmentLinks([]);
        return;
      }

      const results = await Promise.all(
        attachments.map(async (path) => {
          const filePath = String(path);
          const { data, error } = await supabase.storage
            .from("report-attachments")
            .createSignedUrl(filePath, 3600);
          if (error || !data?.signedUrl) {
            return { path: filePath, url: "" };
          }
          return { path: filePath, url: data.signedUrl };
        })
      );

      if (!isMounted) return;
      setAttachmentLinks(results.filter((item) => item.url));
    };

    void loadAttachments();
    return () => {
      isMounted = false;
    };
  }, [details]);

  useEffect(() => {
    let isMounted = true;
    const loadActivity = async () => {
      if (!details?.report?.report_id) {
        setStatusHistory([]);
        setComments([]);
        setActions([]);
        return;
      }
      const [{ data: historyData }, { data: commentData }, { data: actionData }] = await Promise.all([
        supabase
          .from("report_status_history")
          .select("id,report_id,status_id,comment_text,changed_at,report_statuses(code,label)")
          .eq("report_id", details.report.report_id)
          .order("changed_at", { ascending: false }),
        supabase
          .from("report_comments")
          .select("comment_id,report_id,comment_text,created_at")
          .eq("report_id", details.report.report_id)
          .order("created_at", { ascending: false }),
        supabase
          .from("report_actions")
          .select(
            "action_id,report_id,action_description,status,status_id,due_date,created_at,report_action_statuses(code,label)"
          )
          .eq("report_id", details.report.report_id)
          .order("created_at", { ascending: false }),
      ]);

      if (!isMounted) return;
      setStatusHistory((historyData ?? []) as StatusHistoryRow[]);
      setComments((commentData ?? []) as CommentRow[]);
      const mappedActions =
        (actionData ?? []).map((action) => ({
          ...action,
          status_code: action.report_action_statuses?.code ?? action.status ?? null,
          status_label: action.report_action_statuses?.label ?? action.status ?? null,
        })) ?? [];
      setActions(mappedActions as ActionRow[]);
    };

    void loadActivity();
    return () => {
      isMounted = false;
    };
  }, [details?.report?.report_id]);

  return (
    <SectionCard
      title="Reports"
      description="Review the status and responses for each grievance you submitted."
      actions={
        <div className="flex items-center gap-2">
          <select className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600">
            <option>Sort</option>
            <option>Newest</option>
            <option>Oldest</option>
          </select>
          <button className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">
            Filter
          </button>
          <Link
            href="/report/new"
            className="rounded-full bg-[var(--wb-cobalt)] px-4 py-2 text-xs font-semibold text-white"
          >
            New
          </Link>
        </div>
      }
    >
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              activeTab === tab
                ? "bg-[var(--wb-cobalt)] text-white"
                : "border border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {filteredRows.length ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full min-w-[760px] text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">Report</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">View</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.report_id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.report_code}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <span>{row.title}</span>
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 px-2 py-1 text-[11px]"
                          onClick={() => openDetails(row.report_id)}
                          disabled={loadingDetails}
                        >
                          View
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {row.status_label ?? row.status_code ?? row.status ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      {row.created_at ? new Date(row.created_at).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="rounded-full border border-slate-200 px-2 py-1 text-[11px]"
                        onClick={() => openDetails(row.report_id)}
                        disabled={loadingDetails}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No reports yet"
            description="Create a grievance report to see updates and communicate securely with organisations."
            actionLabel="Add new"
          />
        )}
      </div>
      {error ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      ) : null}

      <Modal
        open={viewOpen}
        title="View Report"
        description="Review the information you submitted and track status."
        onClose={() => setViewOpen(false)}
        size="2xl"
        bodyClassName="max-h-[78vh] overflow-y-auto"
      >
        {details?.report ? (
          (() => {
            return (
              <div className="space-y-6">
                <div className="grid gap-3 lg:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs text-slate-400">Report ID</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {details.report.report_code ?? "-"}
                    </p>
                    <p className="mt-3 text-xs text-slate-400">Status</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {details.report.status_label ??
                        details.report.status_code ??
                        details.report.status ??
                        "-"}
                    </p>
                    <p className="mt-3 text-xs text-slate-400">Filter result</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {details.report.filter_result_label ?? "N/A"}
                    </p>
                    <p className="mt-3 text-xs text-slate-400">Assigned Department</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {details.report.organization_departments?.name ?? "-"}
                    </p>
                    <p className="mt-3 text-xs text-slate-400">Triage Workflow</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {details.report.triage_workflows?.name ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs text-slate-400">Creation Date</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {details.report.created_at
                        ? new Date(details.report.created_at).toLocaleString()
                        : "-"}
                    </p>
                    <p className="mt-3 text-xs text-slate-400">Original Language</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {details.report.original_language ?? "Unknown"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs text-slate-400">Incident Location</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {details.report.incident_location ?? "-"}
                    </p>
                    <p className="mt-3 text-xs text-slate-400">Country</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {details.report.country ?? "-"}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                    {["details", "actions", "activity"].map((tab) => (
                      <button
                        key={tab}
                        className={`rounded-full px-3 py-1 ${
                          detailsTab === tab
                            ? "bg-[var(--wb-cobalt)] text-white"
                            : "border border-slate-200"
                        }`}
                        onClick={() => setDetailsTab(tab as typeof detailsTab)}
                      >
                        {tab === "details" ? "Details" : tab === "actions" ? "Actions" : "Activity Log"}
                      </button>
                    ))}
                  </div>

                  {detailsTab === "details" ? (
                    <div className="mt-4 space-y-4 text-sm text-slate-600">
                      <div>
                        <p className="text-xs text-slate-400">Report subject</p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {details.report.title ?? "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Description</p>
                        <p className="mt-1">{details.report.description ?? "-"}</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 text-xs text-slate-600">
                        <div>
                          <p className="text-[11px] uppercase text-slate-400">Incident date</p>
                          <p className="font-semibold">{details.report.incident_date ?? "-"}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase text-slate-400">Severity</p>
                          <p className="font-semibold">{details.report.severity_level ?? "-"}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase text-slate-400">Continuing</p>
                          <p className="font-semibold">
                            {details.report.is_incident_is_continuing ? "Yes" : "No"}
                          </p>
                        </div>
                      </div>
                      {details.report.suggested_remedy ? (
                        <div>
                          <p className="text-xs text-slate-400">Suggested remedy</p>
                          <p className="mt-1">{details.report.suggested_remedy}</p>
                        </div>
                      ) : null}
                      {details.report.legal_steps_taken ? (
                        <div>
                          <p className="text-xs text-slate-400">Legal steps taken</p>
                          <p className="mt-1">{details.report.legal_steps_taken}</p>
                        </div>
                      ) : null}
                      <div>
                        <p className="text-xs text-slate-400">Files</p>
                        {attachmentLinks.length ? (
                          <ul className="mt-2 space-y-2 text-xs">
                            {attachmentLinks.map((file) => (
                              <li key={file.path} className="flex items-center justify-between">
                                <span className="truncate">{file.path.split("/").pop()}</span>
                                <a
                                  className="text-[var(--wb-cobalt)]"
                                  href={file.url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  View
                                </a>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-1 text-xs text-slate-400">No files attached.</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Report progression</p>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                          {statusOptions.map((status) => {
                            const current = details.report.status_code ?? details.report.status ?? null;
                            const isActive = current === status;
                            return (
                              <div
                                key={status}
                                className={`rounded-full border px-2 py-1 ${
                                  isActive
                                    ? "border-[var(--wb-cobalt)] bg-[var(--wb-cobalt)]/10 text-[var(--wb-cobalt)]"
                                    : "border-slate-200 text-slate-500"
                                }`}
                              >
                                {status.replace(/_/g, " ")}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {detailsTab === "actions" ? (
                    <div className="mt-4 space-y-3 text-sm text-slate-600">
                      {actions.length ? (
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                          <table className="w-full min-w-[520px] text-left text-xs">
                            <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.15em] text-slate-400">
                              <tr>
                                <th className="px-3 py-2">Action</th>
                                <th className="px-3 py-2">Status</th>
                                <th className="px-3 py-2">Due Date</th>
                                <th className="px-3 py-2">Created</th>
                              </tr>
                            </thead>
                            <tbody>
                              {actions.map((action) => (
                                <tr key={action.action_id} className="border-t border-slate-100">
                                  <td className="px-3 py-2">{action.action_description || "-"}</td>
                                  <td className="px-3 py-2">
                                    {action.status_label ?? action.status_code ?? action.status ?? "-"}
                                  </td>
                                  <td className="px-3 py-2">
                                    {action.due_date ? new Date(action.due_date).toLocaleDateString() : "-"}
                                  </td>
                                  <td className="px-3 py-2">
                                    {action.created_at ? new Date(action.created_at).toLocaleString() : "-"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">No actions recorded yet.</p>
                      )}
                    </div>
                  ) : null}

                  {detailsTab === "activity" ? (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600 shadow-sm">
                      <p className="text-sm font-semibold text-slate-700">Activity Timeline</p>
                      {(() => {
                        const statusUpdates = statusHistory.map((entry) => ({
                          id: `status-${entry.id}`,
                          created_at: entry.changed_at,
                          title: entry.report_statuses?.label ?? "Status updated",
                          comment: entry.comment_text ?? null,
                        }));
                        const commentUpdates = comments.map((entry) => ({
                          id: `comment-${entry.comment_id}`,
                          created_at: entry.created_at,
                          title: "Comment added",
                          comment: entry.comment_text,
                        }));
                        const activityItems = [...statusUpdates, ...commentUpdates].sort((a, b) => {
                          const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
                          const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
                          return bTime - aTime;
                        });
                        if (!activityItems.length) {
                          return <p className="mt-4 text-xs text-slate-400">No activity yet.</p>;
                        }
                        return (
                          <div className="relative mt-4 space-y-4">
                            <span className="absolute left-2 top-2 h-full w-px bg-slate-200" />
                            {activityItems.map((item) => (
                              <div key={item.id} className="relative pl-6">
                                <span className="absolute left-[0.35rem] top-2 h-2 w-2 rounded-full bg-[var(--wb-cobalt)]" />
                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                  <p className="text-[11px] text-slate-500">
                                    {item.created_at ? new Date(item.created_at).toLocaleString() : "-"}
                                  </p>
                                  <p className="mt-1 text-xs font-semibold text-slate-700">{item.title}</p>
                                  {item.comment ? (
                                    <p className="mt-1 text-xs text-slate-600">{item.comment}</p>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })()
        ) : (
          <p className="text-sm text-slate-500">Select a report to view details.</p>
        )}
      </Modal>
    </SectionCard>
  );
}
