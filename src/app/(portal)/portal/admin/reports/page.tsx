"use client";

import { useEffect, useMemo, useState } from "react";
import SectionCard from "@/components/portal/SectionCard";
import { adminInvoke } from "@/lib/adminApi";
import { supabase } from "@/lib/supabase/client";
import Modal from "@/components/portal/Modal";

type ReportRow = {
  report_id: number;
  report_code: string;
  title: string;
  description: string;
  spam_score: number | null;
  created_at: string | null;
  incident_location: string | null;
  status: string | null;
  is_spam: boolean | null;
  organisation: string;
  reporter: string;
};

type ReportDetailRow = {
  report_id: number;
  report_code: string | null;
  title?: string | null;
  description: string | null;
  status: string | null;
  created_at: string | null;
  incident_location: string | null;
  incident_date?: string | null;
  country?: string | null;
  event_country?: string | null;
  is_incident_is_continuing?: boolean | null;
  severity_level: number | null;
  is_spam: boolean | null;
  reporter_email: string | null;
  original_language?: string | null;
  share_contact_with_company?: boolean | null;
  alert_direct_suppliers?: boolean | null;
  alert_indirect_suppliers?: boolean | null;
  suggested_remedy?: string | null;
  legal_steps_taken?: string | null;
  intake_payload?: Record<string, unknown> | null;
};

type ReportDetails = {
  report: ReportDetailRow;
  reporter: {
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
    email: string | null;
    phone: string | null;
    job_title: string | null;
    department: string | null;
    location: string | null;
  } | null;
  organisation: {
    organization_id: number;
    name: string;
    organization_type: string | null;
    country: string | null;
    city: string | null;
    website: string | null;
    legal_type: string | null;
    company_code: string | null;
  } | null;
};

const statusOptions = [
  "waiting_filter",
  "open",
  "investigation",
  "escalated",
  "out_of_scope",
  "archived",
];

export default function AdminReportsPage() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [details, setDetails] = useState<ReportDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "actions" | "activity">("details");
  const [attachmentLinks, setAttachmentLinks] = useState<
    { path: string; url: string }[]
  >([]);

  useEffect(() => {
    let isMounted = true;
    adminInvoke<{ reports: ReportRow[] }>("listReports")
      .then((data) => {
        if (!isMounted) return;
        setRows(data.reports);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unable to load reports.");
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredRows = useMemo(() => {
    if (!statusFilter) return rows;
    return rows.filter((row) => row.status === statusFilter);
  }, [rows, statusFilter]);

  const updateReport = async (reportId: number, updates: Record<string, unknown>) => {
    setIsSaving(true);
    setError(null);
    try {
      await adminInvoke("updateReport", { report_id: reportId, ...updates });
      setRows((prev) =>
        prev.map((row) => (row.report_id === reportId ? { ...row, ...updates } : row))
      );
      setDetails((prev) =>
        prev && prev.report.report_id === reportId
          ? { ...prev, report: { ...prev.report, ...updates } }
          : prev
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update report.");
    } finally {
      setIsSaving(false);
    }
  };

  const openDetails = async (reportId: number) => {
    setIsLoadingDetails(true);
    setError(null);
    try {
      const data = await adminInvoke<ReportDetails>("getReportDetails", { report_id: reportId });
      setDetails(data);
      setActiveTab("details");
      setViewOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load report details.");
    } finally {
      setIsLoadingDetails(false);
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

  const statusStyle = (status: string) => {
    switch (status) {
      case "waiting_filter":
        return { text: "text-amber-600", border: "border-amber-200", bg: "bg-amber-500" };
      case "open":
        return { text: "text-sky-600", border: "border-sky-200", bg: "bg-sky-500" };
      case "investigation":
        return { text: "text-indigo-600", border: "border-indigo-200", bg: "bg-indigo-500" };
      case "escalated":
        return { text: "text-rose-600", border: "border-rose-200", bg: "bg-rose-500" };
      case "out_of_scope":
        return { text: "text-slate-500", border: "border-slate-200", bg: "bg-slate-400" };
      case "archived":
        return { text: "text-emerald-600", border: "border-emerald-200", bg: "bg-emerald-500" };
      default:
        return { text: "text-slate-400", border: "border-slate-200", bg: "bg-slate-400" };
    }
  };

  const renderStatusStepper = (current: string | null | undefined) => (
    <div className="relative ml-1 space-y-3">
      {statusOptions.map((status, index) => {
        const isActive = current === status;
        const isLast = index === statusOptions.length - 1;
        const color = statusStyle(status);
        return (
          <button
            key={status}
            type="button"
            className="relative flex w-full items-center gap-3 rounded-xl px-2 py-1 text-left transition hover:bg-slate-50"
            onClick={() =>
              updateReport(Number(details?.report.report_id), {
                status,
              })
            }
          >
            <div className="relative flex h-8 w-8 items-center justify-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-semibold ${
                  isActive
                    ? `${color.bg} text-white border-transparent`
                    : `bg-white ${color.text} ${color.border}`
                }`}
              >
                {index + 1}
              </div>
              {!isLast ? (
                <div className="absolute left-1/2 top-8 h-6 w-px -translate-x-1/2 bg-slate-200" />
              ) : null}
            </div>
            <div>
              <p className={`text-xs font-semibold ${isActive ? "text-slate-900" : "text-slate-500"}`}>
                {status.replace(/_/g, " ")}
              </p>
              {isActive ? <span className="text-[11px] text-slate-400">Current status</span> : null}
            </div>
          </button>
        );
      })}
    </div>
  );

  return (
    <SectionCard
      title="Reports"
      description={`${filteredRows.length} results`}
      actions={
        <div className="flex items-center gap-2">
          <select
            className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">Review status</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600">
            <option>Sort</option>
            <option>Newest</option>
          </select>
          <select className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600">
            <option>Filter</option>
          </select>
        </div>
      }
    >
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[900px] text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.2em] text-slate-400">
            <tr>
              <th className="px-4 py-3">No</th>
              <th className="px-4 py-3">Reporter</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Spam Score</th>
              <th className="px-4 py-3">Creation Date</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Spam</th>
              <th className="px-4 py-3">View</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, index) => (
              <tr key={row.report_id} className="border-t border-slate-100">
                <td className="px-4 py-3">{index + 1}</td>
                <td className="px-4 py-3">{row.reporter}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span>{row.title}</span>
                    <button
                      type="button"
                      className="rounded-full border border-slate-200 px-2 py-1 text-[11px]"
                      onClick={() => openDetails(row.report_id)}
                      disabled={isLoadingDetails}
                    >
                      View
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3">{row.description}</td>
                <td className="px-4 py-3">{row.spam_score ?? 0}</td>
                <td className="px-4 py-3">
                  {row.created_at ? new Date(row.created_at).toLocaleDateString() : "-"}
                </td>
                <td className="px-4 py-3">{row.incident_location || "-"}</td>
                <td className="px-4 py-3">{row.organisation}</td>
                <td className="px-4 py-3">
                  <select
                    className="rounded-full border border-slate-200 px-2 py-1 text-[11px]"
                    value={row.status || ""}
                    disabled={isSaving}
                    onChange={(event) =>
                      updateReport(row.report_id, { status: event.target.value || null })
                    }
                  >
                    <option value="">-</option>
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                    {row.status && !statusOptions.includes(row.status) ? (
                      <option value={row.status}>{row.status}</option>
                    ) : null}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 px-2 py-1 text-[11px]"
                    disabled={isSaving}
                    onClick={() => updateReport(row.report_id, { is_spam: !row.is_spam })}
                  >
                    {row.is_spam ? "Spam" : "Clean"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 px-2 py-1 text-[11px]"
                    onClick={() => openDetails(row.report_id)}
                    disabled={isLoadingDetails}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      ) : null}

      <Modal
        open={viewOpen}
        title="View & Update Report"
        description="Review, update status, and follow up with relevant parties."
        onClose={() => setViewOpen(false)}
        size="2xl"
        bodyClassName="max-h-[78vh] overflow-y-auto"
      >
        {details?.report ? (
          (() => {
            const copyLink = () => {
              const code = details.report.report_code ?? "";
              if (!code) return;
              const url = `${window.location.origin}/portal/admin/reports?report=${code}`;
              void navigator.clipboard.writeText(url);
            };

            return (
              <div className="space-y-6">
                <div className="grid gap-3 lg:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs text-slate-400">Report Source</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {details.organisation?.name ?? "WhiteBox"}
                    </p>
                    <p className="mt-3 text-xs text-slate-400">Report ID</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {details.report.report_code ?? "-"}
                    </p>
                    <p className="mt-3 text-xs text-slate-400">Report Stage</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {details.report.status ?? "waiting_filter"}
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
                    <p className="mt-3 text-xs text-slate-400">Last Modified</p>
                    <p className="text-sm font-semibold text-slate-900">-</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs text-slate-400">Share with others</p>
                    <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={Boolean(details.report.share_contact_with_company)}
                        onChange={(event) =>
                          updateReport(Number(details.report.report_id), {
                            share_contact_with_company: event.target.checked,
                          })
                        }
                      />
                      Share reporter contact
                    </label>
                    <button
                      type="button"
                      className="mt-4 w-full rounded-full bg-[var(--wb-cobalt)] px-4 py-2 text-xs font-semibold text-white"
                      onClick={copyLink}
                    >
                      Copy Report Link
                    </button>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.05fr_2fr]">
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs text-slate-400">Report Status</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {details.report.status ?? "-"}
                      </p>
                      <div className="mt-4">{renderStatusStepper(details.report.status)}</div>
                      <button
                        type="button"
                        className="mt-4 w-full rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
                        onClick={() =>
                          updateReport(Number(details.report.report_id), {
                            need_super_admin_review: true,
                          })
                        }
                      >
                        Flag Not Right
                      </button>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs text-slate-400">Spam Review</p>
                      <button
                        type="button"
                        className="mt-3 w-full rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
                        onClick={() =>
                          updateReport(Number(details.report.report_id), {
                            is_spam: !details.report.is_spam,
                          })
                        }
                      >
                        {details.report.is_spam ? "Mark clean" : "Mark spam"}
                      </button>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs text-slate-400">Escalation</p>
                      <div className="mt-3 space-y-3 text-xs text-slate-600">
                        <div className="flex items-center justify-between">
                          <span>Direct Suppliers</span>
                          <button
                            type="button"
                            className="rounded-full bg-[var(--wb-cobalt)] px-3 py-1 text-xs font-semibold text-white"
                            onClick={() =>
                              updateReport(Number(details.report.report_id), {
                                alert_direct_suppliers: !details.report.alert_direct_suppliers,
                              })
                            }
                          >
                            {details.report.alert_direct_suppliers ? "Included" : "Escalate"}
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Indirect Suppliers</span>
                          <button
                            type="button"
                            className="rounded-full bg-[var(--wb-cobalt)] px-3 py-1 text-xs font-semibold text-white"
                            onClick={() =>
                              updateReport(Number(details.report.report_id), {
                                alert_indirect_suppliers: !details.report.alert_indirect_suppliers,
                              })
                            }
                          >
                            {details.report.alert_indirect_suppliers ? "Included" : "Escalate"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                      {["details", "actions", "activity"].map((tab) => (
                        <button
                          key={tab}
                          className={`rounded-full px-3 py-1 ${
                            activeTab === tab
                              ? "bg-[var(--wb-cobalt)] text-white"
                              : "border border-slate-200"
                          }`}
                          onClick={() => setActiveTab(tab as typeof activeTab)}
                        >
                          {tab === "details" ? "Details" : tab === "actions" ? "Actions" : "Activity Log"}
                        </button>
                      ))}
                    </div>

                    {activeTab === "details" ? (
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
                            <p className="text-[11px] uppercase text-slate-400">Incident location</p>
                            <p className="font-semibold">{details.report.incident_location ?? "-"}</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase text-slate-400">Country</p>
                            <p className="font-semibold">{details.report.country ?? "-"}</p>
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
                        {details.report.legal_steps_taken ? (
                          <div>
                            <p className="text-xs text-slate-400">Legal steps taken</p>
                            <p className="mt-1">{details.report.legal_steps_taken}</p>
                          </div>
                        ) : null}
                        {details.report.suggested_remedy ? (
                          <div>
                            <p className="text-xs text-slate-400">Suggested remedy</p>
                            <p className="mt-1">{details.report.suggested_remedy}</p>
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
                      </div>
                    ) : null}

                    {activeTab === "actions" ? (
                      <div className="mt-4 space-y-3 text-sm text-slate-600">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs">
                          Use the actions panel to coordinate escalations and follow-up steps.
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 text-xs text-slate-600">
                          <div>
                            <p className="text-[11px] uppercase text-slate-400">Reporter</p>
                            <p className="font-semibold">
                              {details.reporter?.display_name ||
                                [details.reporter?.first_name, details.reporter?.last_name]
                                  .filter(Boolean)
                                  .join(" ") ||
                                details.report.reporter_email ||
                                "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase text-slate-400">Organisation</p>
                            <p className="font-semibold">{details.organisation?.name ?? "-"}</p>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {activeTab === "activity" ? (
                      <div className="mt-4 text-xs text-slate-500">
                        Activity log will appear here as workflow events are tracked.
                      </div>
                    ) : null}
                  </div>
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
