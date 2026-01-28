"use client";

import { useEffect, useMemo, useState } from "react";
import EmptyState from "@/components/portal/EmptyState";
import Modal from "@/components/portal/Modal";
import SectionCard from "@/components/portal/SectionCard";
import { supabase } from "@/lib/supabase/client";
import { loadOrgContext } from "@/lib/orgContext";
import { isValidEmail } from "@/lib/validation";

type ReportRow = {
  report_id: number;
  report_code: string;
  title: string;
  description: string;
  status: string | null;
  created_at: string | null;
  incident_location: string | null;
  is_spam: boolean | null;
};

type ReportDetails = {
  report: ReportRow & {
    incident_date: string | null;
    country: string | null;
    severity_level: number | null;
    reporter_email: string | null;
    suggested_remedy: string | null;
    legal_steps_taken: string | null;
    report_code?: string | null;
    title?: string | null;
    incident_location?: string | null;
    created_at?: string | null;
    is_anonymous?: boolean | null;
    share_contact_with_company?: boolean | null;
    alert_direct_suppliers?: boolean | null;
    alert_indirect_suppliers?: boolean | null;
    original_language?: string | null;
    is_incident_is_continuing?: boolean | null;
    intake_payload?: Record<string, unknown> | null;
  };
};

const tabs = [
  { key: "all", label: "All Reports" },
  { key: "open", label: "Active" },
  { key: "waiting_filter", label: "Filter" },
  { key: "archived", label: "Archive" },
  { key: "spam", label: "Spam" },
];

const statusOptions = [
  "waiting_filter",
  "open",
  "investigation",
  "escalated",
  "out_of_scope",
  "archived",
];

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ title: "", description: "", reporterEmail: "" });
  const [viewOpen, setViewOpen] = useState(false);
  const [details, setDetails] = useState<ReportDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsTab, setDetailsTab] = useState<"details" | "actions" | "activity">("details");
  const [attachmentLinks, setAttachmentLinks] = useState<
    { path: string; url: string }[]
  >([]);

  useEffect(() => {
    let isMounted = true;
    const loadReports = async () => {
      try {
        const context = await loadOrgContext();
        const { data: rows, error: reportError } = await supabase
          .from("reports")
          .select(
            "report_id,report_code,title,description,status,created_at,incident_location,is_spam"
          )
          .eq("reported_org_id", context.organizationId)
          .order("created_at", { ascending: false });

        if (reportError) throw new Error(reportError.message);
        if (!isMounted) return;
        setReports(rows ?? []);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unable to load reports.");
      }
    };

    loadReports();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredReports = useMemo(() => {
    if (activeTab === "spam") return reports.filter((row) => row.is_spam);
    if (activeTab === "all") return reports;
    return reports.filter((row) => row.status === activeTab);
  }, [reports, activeTab]);

  const updateReport = async (reportId: number, updates: Partial<ReportRow>) => {
    setSaving(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from("reports")
        .update(updates)
        .eq("report_id", reportId);
      if (updateError) throw new Error(updateError.message);
      setReports((prev) =>
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
      setSaving(false);
    }
  };

  const openDetails = async (reportId: number) => {
    setLoadingDetails(true);
    setError(null);
    try {
      const { data: reportRow, error: reportError } = await supabase
        .from("reports")
        .select(
          "report_id,report_code,title,description,status,created_at,incident_location,is_spam,incident_date,country,severity_level,reporter_email,suggested_remedy,legal_steps_taken,is_anonymous,share_contact_with_company,alert_direct_suppliers,alert_indirect_suppliers,original_language,is_incident_is_continuing,intake_payload"
        )
        .eq("report_id", reportId)
        .maybeSingle();
      if (reportError) throw new Error(reportError.message);
      if (!reportRow) throw new Error("Report not found.");
      setDetails({ report: reportRow as ReportDetails["report"] });
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

  const renderStatusStepper = (current: string | null | undefined, reportId: number) => (
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
            onClick={() => updateReport(reportId, { status })}
          >
            <div className="relative flex h-8 w-8 items-center justify-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-semibold ${
                  isActive ? `${color.bg} text-white border-transparent` : `bg-white ${color.text} ${color.border}`
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

  const createDraft = async () => {
    if (!draft.title.trim() || !draft.description.trim()) {
      setError("Title and description are required.");
      return;
    }
    if (draft.reporterEmail && !isValidEmail(draft.reporterEmail)) {
      setError("Enter a valid reporter email.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const context = await loadOrgContext();
      const reportCode = `WB-${Math.floor(100000 + Math.random() * 900000)}`;
      const { data: insertRow, error: insertError } = await supabase
        .from("reports")
        .insert({
          report_code: reportCode,
          title: draft.title.trim(),
          description: draft.description.trim(),
          reported_org_id: context.organizationId,
          reporter_org_id: context.organizationId,
          reporter_user_id: context.userId,
          reporter_email: draft.reporterEmail.trim() || null,
          status: "open",
          is_anonymous: false,
          requires_anonymization: false,
        })
        .select(
          "report_id,report_code,title,description,status,created_at,incident_location,is_spam"
        )
        .single();

      if (insertError || !insertRow) {
        throw new Error(insertError?.message ?? "Unable to create report draft.");
      }

      setReports((prev) => [insertRow, ...prev]);
      setDraft({ title: "", description: "", reporterEmail: "" });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create report draft.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title="Reports"
        description="Review reports visible to your organisation and manage escalation."
        actions={
          <div className="flex items-center gap-2">
            <select className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600">
              <option>Newest first</option>
              <option>Oldest first</option>
            </select>
            <button
              className="rounded-full bg-[var(--wb-cobalt)] px-4 py-2 text-xs font-semibold text-white"
              onClick={() => setOpen(true)}
            >
              New
            </button>
          </div>
        }
      >
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                activeTab === tab.key
                  ? "bg-[var(--wb-cobalt)] text-white"
                  : "border border-slate-200 text-slate-500 hover:border-slate-300"
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {filteredReports.length ? (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-[880px] text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">View</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((row) => (
                  <tr key={row.report_id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-semibold text-slate-800">{row.report_code}</td>
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
                      <td className="px-4 py-3">{row.description}</td>
                      <td className="px-4 py-3">{row.incident_location || "-"}</td>
                      <td className="px-4 py-3">
                        {row.created_at ? new Date(row.created_at).toLocaleDateString() : "-"}
                      </td>
                    <td className="px-4 py-3">
                      <select
                        className="rounded-full border border-slate-200 px-2 py-1 text-[11px]"
                        value={row.status || ""}
                        disabled={saving}
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
                        </select>
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
              description="Once a stakeholder submits a grievance, it will appear here with the correct visibility level."
              actionLabel="Add new"
            />
          )}
        </div>
      </SectionCard>

      <Modal
        open={open}
        title="Create a new report"
        description="Start a manual report entry or invite a stakeholder to submit securely."
        onClose={() => setOpen(false)}
        actions={
          <>
            <button
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button
              className="rounded-full bg-[var(--wb-cobalt)] px-4 py-2 text-xs font-semibold text-white"
              onClick={createDraft}
              disabled={saving}
            >
              Create draft
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500">Report title</label>
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={draft.title}
              onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Description</label>
            <textarea
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              rows={3}
              value={draft.description}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, description: event.target.value }))
              }
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Stakeholder email (optional)</label>
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={draft.reporterEmail}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, reporterEmail: event.target.value }))
              }
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={viewOpen}
        title="View & Update Report"
        description="Review grievance details and coordinate follow-up."
        onClose={() => setViewOpen(false)}
        size="2xl"
        bodyClassName="max-h-[78vh] overflow-y-auto"
      >
        {details?.report ? (
          (() => {
            const reporterVisible =
              !details.report.is_anonymous && details.report.share_contact_with_company;

            return (
              <div className="space-y-6">
                <div className="grid gap-3 lg:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs text-slate-400">Report ID</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
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
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs text-slate-400">Reporter Contact</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {reporterVisible ? details.report.reporter_email ?? "-" : "Hidden"}
                    </p>
                    <p className="mt-3 text-xs text-slate-400">Sharing Enabled</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {details.report.share_contact_with_company ? "Yes" : "No"}
                    </p>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.05fr_2fr]">
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs text-slate-400">Report Status</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {details.report.status ?? "-"}
                      </p>
                      <div className="mt-4">
                        {renderStatusStepper(details.report.status, details.report.report_id)}
                      </div>
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
                              updateReport(details.report.report_id, {
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
                              updateReport(details.report.report_id, {
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
                            <p className="text-[11px] uppercase text-slate-400">Location</p>
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

                    {detailsTab === "actions" ? (
                      <div className="mt-4 text-xs text-slate-500">
                        Track actions and remediation steps in the Actions module.
                      </div>
                    ) : null}

                    {detailsTab === "activity" ? (
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

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
