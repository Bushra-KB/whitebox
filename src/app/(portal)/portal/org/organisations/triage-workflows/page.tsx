"use client";

import { useEffect, useMemo, useState } from "react";
import EmptyState from "@/components/portal/EmptyState";
import Modal from "@/components/portal/Modal";
import SectionCard from "@/components/portal/SectionCard";
import { loadOrgContext } from "@/lib/orgContext";
import { supabase } from "@/lib/supabase/client";

type WorkflowRow = {
  workflow_id: number;
  organization_id: number;
  name: string;
  description: string | null;
  report_type: string;
  priority: number;
  is_active: boolean;
  default_department_id: number | null;
  preprocessing_config: Record<string, unknown> | null;
  status_action_config: Record<string, unknown> | null;
  deadline_config: Record<string, unknown> | null;
  triage_workflow_conditions?: {
    condition_id: number;
    country_codes: string[];
    language_codes: string[];
    risk_category_ids: number[];
    risk_subcategory_ids: number[];
    supplier_org_ids: number[];
    worksite_ids: number[];
    reporter_min_age: number | null;
    reporter_max_age: number | null;
    severity_levels: number[];
    membership_tags: string[];
    form_key: string | null;
  } | null;
};

type OptionItem = {
  id: string;
  label: string;
};

type FormState = {
  workflow_id: number | null;
  name: string;
  description: string;
  report_type: string;
  priority: number;
  is_active: boolean;
  default_department_id: string;
  country_codes: string[];
  language_codes: string[];
  risk_category_ids: string[];
  risk_subcategory_ids: string[];
  supplier_org_ids: string[];
  worksite_ids: string[];
  severity_levels: string[];
  reporter_min_age: string;
  reporter_max_age: string;
  membership_tags: string;
  form_key: string;
  enable_ai_spam_filter: boolean;
  enable_auto_translate: boolean;
  enable_ai_out_of_scope: boolean;
  enable_ai_risk_analysis: boolean;
  enable_human_translator: boolean;
  allow_select_result: boolean;
  allowed_filter_results: string[];
  allow_comment: boolean;
  allow_manage_actions: boolean;
  allow_change_status: boolean;
  allowed_status_codes: string[];
  require_reporter_update_on_status_change: boolean;
  use_workflow_deadlines: boolean;
  first_response_hours: string;
  investigation_days: string;
  remediation_days: string;
};

const initialForm: FormState = {
  workflow_id: null,
  name: "",
  description: "",
  report_type: "default",
  priority: 100,
  is_active: true,
  default_department_id: "",
  country_codes: [],
  language_codes: [],
  risk_category_ids: [],
  risk_subcategory_ids: [],
  supplier_org_ids: [],
  worksite_ids: [],
  severity_levels: [],
  reporter_min_age: "",
  reporter_max_age: "",
  membership_tags: "",
  form_key: "",
  enable_ai_spam_filter: true,
  enable_auto_translate: false,
  enable_ai_out_of_scope: true,
  enable_ai_risk_analysis: true,
  enable_human_translator: false,
  allow_select_result: true,
  allowed_filter_results: ["admitted", "out_of_scope", "unfounded", "spam"],
  allow_comment: true,
  allow_manage_actions: true,
  allow_change_status: true,
  allowed_status_codes: ["pre_evaluation", "waiting_admitted", "open_in_progress", "investigation", "remediation", "archived"],
  require_reporter_update_on_status_change: false,
  use_workflow_deadlines: false,
  first_response_hours: "",
  investigation_days: "",
  remediation_days: "",
};

const filterResultOptions: OptionItem[] = [
  { id: "admitted", label: "Admitted" },
  { id: "out_of_scope", label: "Out of Scope" },
  { id: "unfounded", label: "Unfounded" },
  { id: "spam", label: "Spam" },
];

const severityOptions: OptionItem[] = [
  { id: "1", label: "1" },
  { id: "2", label: "2" },
  { id: "3", label: "3" },
  { id: "4", label: "4" },
  { id: "5", label: "5" },
];

function MultiSelectChips({
  label,
  options,
  selected,
  onToggle,
  emptyLabel,
}: {
  label: string;
  options: OptionItem[];
  selected: string[];
  onToggle: (id: string) => void;
  emptyLabel?: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      {options.length ? (
        <div className="mt-2 flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-xl border border-slate-200 p-2">
          {options.map((option) => {
            const active = selected.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onToggle(option.id)}
                className={`rounded-full border px-2 py-1 text-[11px] transition ${
                  active
                    ? "border-[var(--wb-cobalt)] bg-[var(--wb-cobalt)]/10 text-[var(--wb-cobalt)]"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-2 text-xs text-slate-400">{emptyLabel ?? "No options available."}</p>
      )}
    </div>
  );
}

function toIntArray(values: string[]) {
  return values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
}

function toOptionalInt(value: string) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export default function OrganisationTriageWorkflowsPage() {
  const [organizationId, setOrganizationId] = useState<number | null>(null);
  const [rows, setRows] = useState<WorkflowRow[]>([]);
  const [departments, setDepartments] = useState<OptionItem[]>([]);
  const [countries, setCountries] = useState<OptionItem[]>([]);
  const [languages, setLanguages] = useState<OptionItem[]>([]);
  const [riskCategories, setRiskCategories] = useState<OptionItem[]>([]);
  const [riskSubCategories, setRiskSubCategories] = useState<OptionItem[]>([]);
  const [suppliers, setSuppliers] = useState<OptionItem[]>([]);
  const [worksites, setWorksites] = useState<OptionItem[]>([]);
  const [statusCodes, setStatusCodes] = useState<OptionItem[]>([]);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);

  const departmentNameById = useMemo(() => {
    const map = new Map<string, string>();
    departments.forEach((department) => map.set(department.id, department.label));
    return map;
  }, [departments]);

  const loadAll = async (orgId: number) => {
    const [
      { data: workflowRows, error: workflowError },
      { data: departmentRows },
      { data: countryRows },
      { data: languageRows },
      { data: categoryRows },
      { data: subCategoryRows },
      { data: worksiteRows },
      { data: relationshipRows },
      { data: statusRows },
    ] = await Promise.all([
      supabase
        .from("triage_workflows")
        .select(
          "workflow_id,organization_id,name,description,report_type,priority,is_active,default_department_id,preprocessing_config,status_action_config,deadline_config,triage_workflow_conditions(condition_id,country_codes,language_codes,risk_category_ids,risk_subcategory_ids,supplier_org_ids,worksite_ids,reporter_min_age,reporter_max_age,severity_levels,membership_tags,form_key)"
        )
        .eq("organization_id", orgId)
        .order("priority", { ascending: true }),
      supabase
        .from("organization_departments")
        .select("department_id,name")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .order("priority", { ascending: true }),
      supabase.from("countries").select("country_name").order("country_name"),
      supabase.from("languages").select("language_code,language_name").order("language_name"),
      supabase.from("report_categories").select("category_id,name").order("name"),
      supabase.from("report_sub_categories").select("sub_category_id,name").order("name"),
      supabase.from("worksites").select("worksite_id,name").eq("organization_id", orgId).order("name"),
      supabase
        .from("organization_relationships")
        .select("parent_org_id,child_org_id")
        .or(`parent_org_id.eq.${orgId},child_org_id.eq.${orgId}`),
      supabase.from("report_statuses").select("code,label").order("display_order"),
    ]);

    if (workflowError) throw workflowError;

    const relatedOrgIds = new Set<number>();
    (relationshipRows ?? []).forEach((row) => {
      const parent = Number(row.parent_org_id);
      const child = Number(row.child_org_id);
      if (Number.isFinite(parent) && parent !== orgId) relatedOrgIds.add(parent);
      if (Number.isFinite(child) && child !== orgId) relatedOrgIds.add(child);
    });

    let supplierOptions: OptionItem[] = [];
    if (relatedOrgIds.size) {
      const { data: supplierRows } = await supabase
        .from("organisations")
        .select("organization_id,name")
        .in("organization_id", Array.from(relatedOrgIds))
        .order("name");
      supplierOptions = (supplierRows ?? []).map((org) => ({
        id: String(org.organization_id),
        label: org.name,
      }));
    }

    setRows((workflowRows ?? []) as WorkflowRow[]);
    setDepartments(
      (departmentRows ?? []).map((department) => ({
        id: String(department.department_id),
        label: department.name,
      }))
    );
    setCountries((countryRows ?? []).map((country) => ({ id: country.country_name, label: country.country_name })));
    setLanguages(
      (languageRows ?? []).map((language) => ({
        id: language.language_code,
        label: `${language.language_name} (${language.language_code})`,
      }))
    );
    setRiskCategories((categoryRows ?? []).map((item) => ({ id: String(item.category_id), label: item.name })));
    setRiskSubCategories(
      (subCategoryRows ?? []).map((item) => ({ id: String(item.sub_category_id), label: item.name }))
    );
    setWorksites((worksiteRows ?? []).map((item) => ({ id: String(item.worksite_id), label: item.name })));
    setSuppliers(supplierOptions);
    setStatusCodes((statusRows ?? []).map((item) => ({ id: item.code, label: item.label })));
  };

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      try {
        const context = await loadOrgContext();
        if (!isMounted) return;
        setOrganizationId(context.organizationId);
        await loadAll(context.organizationId);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unable to load triage workflows.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void run();
    return () => {
      isMounted = false;
    };
  }, []);

  const toggleInForm = (
    key: keyof Pick<
      FormState,
      | "country_codes"
      | "language_codes"
      | "risk_category_ids"
      | "risk_subcategory_ids"
      | "supplier_org_ids"
      | "worksite_ids"
      | "severity_levels"
      | "allowed_filter_results"
      | "allowed_status_codes"
    >,
    id: string
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(id)
        ? prev[key].filter((value) => value !== id)
        : [...prev[key], id],
    }));
  };

  const openCreate = () => {
    setForm(initialForm);
    setOpen(true);
  };

  const openEdit = (workflow: WorkflowRow) => {
    const condition = workflow.triage_workflow_conditions;
    const preprocessing = workflow.preprocessing_config ?? {};
    const statusAction = workflow.status_action_config ?? {};
    const deadline = workflow.deadline_config ?? {};

    setForm({
      workflow_id: workflow.workflow_id,
      name: workflow.name,
      description: workflow.description ?? "",
      report_type: workflow.report_type || "default",
      priority: workflow.priority ?? 100,
      is_active: Boolean(workflow.is_active),
      default_department_id: workflow.default_department_id ? String(workflow.default_department_id) : "",
      country_codes: (condition?.country_codes ?? []).map(String),
      language_codes: (condition?.language_codes ?? []).map(String),
      risk_category_ids: (condition?.risk_category_ids ?? []).map(String),
      risk_subcategory_ids: (condition?.risk_subcategory_ids ?? []).map(String),
      supplier_org_ids: (condition?.supplier_org_ids ?? []).map(String),
      worksite_ids: (condition?.worksite_ids ?? []).map(String),
      severity_levels: (condition?.severity_levels ?? []).map(String),
      reporter_min_age:
        condition?.reporter_min_age === null || condition?.reporter_min_age === undefined
          ? ""
          : String(condition.reporter_min_age),
      reporter_max_age:
        condition?.reporter_max_age === null || condition?.reporter_max_age === undefined
          ? ""
          : String(condition.reporter_max_age),
      membership_tags: (condition?.membership_tags ?? []).join(", "),
      form_key: condition?.form_key ?? "",
      enable_ai_spam_filter: Boolean(preprocessing.enable_ai_spam_filter),
      enable_auto_translate: Boolean(preprocessing.enable_auto_translate),
      enable_ai_out_of_scope: Boolean(preprocessing.enable_ai_out_of_scope),
      enable_ai_risk_analysis: Boolean(preprocessing.enable_ai_risk_analysis),
      enable_human_translator: Boolean(preprocessing.enable_human_translator),
      allow_select_result: Boolean(statusAction.allow_select_result),
      allowed_filter_results: Array.isArray(statusAction.allowed_filter_results)
        ? (statusAction.allowed_filter_results as string[])
        : initialForm.allowed_filter_results,
      allow_comment: Boolean(statusAction.allow_comment),
      allow_manage_actions: Boolean(statusAction.allow_manage_actions),
      allow_change_status: Boolean(statusAction.allow_change_status),
      allowed_status_codes: Array.isArray(statusAction.allowed_status_codes)
        ? (statusAction.allowed_status_codes as string[])
        : initialForm.allowed_status_codes,
      require_reporter_update_on_status_change: Boolean(
        statusAction.require_reporter_update_on_status_change
      ),
      use_workflow_deadlines: Boolean(deadline.use_workflow_deadlines),
      first_response_hours:
        deadline.first_response_hours === null || deadline.first_response_hours === undefined
          ? ""
          : String(deadline.first_response_hours),
      investigation_days:
        deadline.investigation_days === null || deadline.investigation_days === undefined
          ? ""
          : String(deadline.investigation_days),
      remediation_days:
        deadline.remediation_days === null || deadline.remediation_days === undefined
          ? ""
          : String(deadline.remediation_days),
    });

    setOpen(true);
  };

  const saveWorkflow = async () => {
    if (!organizationId) return;
    if (!form.name.trim()) {
      setError("Workflow name is required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const preprocessingConfig = {
        enable_ai_spam_filter: form.enable_ai_spam_filter,
        enable_auto_translate: form.enable_auto_translate,
        enable_ai_out_of_scope: form.enable_ai_out_of_scope,
        enable_ai_risk_analysis: form.enable_ai_risk_analysis,
        enable_human_translator: form.enable_human_translator,
      };

      const statusActionConfig = {
        allow_select_result: form.allow_select_result,
        allowed_filter_results: form.allowed_filter_results,
        allow_comment: form.allow_comment,
        allow_manage_actions: form.allow_manage_actions,
        allow_change_status: form.allow_change_status,
        allowed_status_codes: form.allowed_status_codes,
        require_reporter_update_on_status_change: form.require_reporter_update_on_status_change,
      };

      const deadlineConfig = {
        use_workflow_deadlines: form.use_workflow_deadlines,
        first_response_hours: toOptionalInt(form.first_response_hours),
        investigation_days: toOptionalInt(form.investigation_days),
        remediation_days: toOptionalInt(form.remediation_days),
      };

      const workflowPayload = {
        organization_id: organizationId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        report_type: form.report_type.trim() || "default",
        priority: form.priority,
        is_active: form.is_active,
        default_department_id: form.default_department_id ? Number(form.default_department_id) : null,
        preprocessing_config: preprocessingConfig,
        status_action_config: statusActionConfig,
        deadline_config: deadlineConfig,
      };

      let workflowId = form.workflow_id;

      if (workflowId) {
        const { error: updateError } = await supabase
          .from("triage_workflows")
          .update(workflowPayload)
          .eq("workflow_id", workflowId)
          .eq("organization_id", organizationId);
        if (updateError) throw updateError;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from("triage_workflows")
          .insert(workflowPayload)
          .select("workflow_id")
          .single();
        if (insertError || !inserted) throw insertError ?? new Error("Unable to create workflow.");
        workflowId = inserted.workflow_id;
      }

      if (!workflowId) throw new Error("Unable to resolve workflow id.");

      const conditionPayload = {
        workflow_id: workflowId,
        country_codes: form.country_codes,
        language_codes: form.language_codes,
        risk_category_ids: toIntArray(form.risk_category_ids),
        risk_subcategory_ids: toIntArray(form.risk_subcategory_ids),
        supplier_org_ids: toIntArray(form.supplier_org_ids),
        worksite_ids: toIntArray(form.worksite_ids),
        reporter_min_age: toOptionalInt(form.reporter_min_age),
        reporter_max_age: toOptionalInt(form.reporter_max_age),
        severity_levels: toIntArray(form.severity_levels),
        membership_tags: form.membership_tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        form_key: form.form_key.trim() || null,
      };

      const { error: conditionError } = await supabase
        .from("triage_workflow_conditions")
        .upsert(conditionPayload, { onConflict: "workflow_id" });
      if (conditionError) throw conditionError;

      await loadAll(organizationId);
      setOpen(false);
      setForm(initialForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save workflow.");
    } finally {
      setSaving(false);
    }
  };

  const deleteWorkflow = async (workflowId: number) => {
    if (!organizationId) return;
    if (!window.confirm("Delete this triage workflow?")) return;

    setSaving(true);
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from("triage_workflows")
        .delete()
        .eq("workflow_id", workflowId)
        .eq("organization_id", organizationId);
      if (deleteError) throw deleteError;
      await loadAll(organizationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete workflow.");
    } finally {
      setSaving(false);
    }
  };

  const reassignReports = async (onlyUnassigned: boolean) => {
    if (!organizationId) return;
    setSaving(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc("assign_org_reports_triage", {
        p_organization_id: organizationId,
        p_only_unassigned: onlyUnassigned,
      });
      if (rpcError) throw rpcError;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to apply assignments.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SectionCard
        title="Triage Workflows"
        description="Define report routing rules, preprocessing, and status/deadline behavior."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
              onClick={() => reassignReports(true)}
              disabled={saving}
            >
              Reassign unassigned
            </button>
            <button
              type="button"
              className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
              onClick={() => reassignReports(false)}
              disabled={saving}
            >
              Rebuild all
            </button>
            <button
              type="button"
              className="rounded-full bg-[var(--wb-cobalt)] px-4 py-2 text-xs font-semibold text-white"
              onClick={openCreate}
            >
              New workflow
            </button>
          </div>
        }
      >
        {loading ? (
          <p className="text-sm text-slate-500">Loading triage workflows...</p>
        ) : rows.length ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Default Dept</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((workflow) => (
                  <tr key={workflow.workflow_id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{workflow.name}</p>
                      <p className="mt-1 text-[11px] text-slate-500">{workflow.description || "No description"}</p>
                    </td>
                    <td className="px-4 py-3">{workflow.report_type || "default"}</td>
                    <td className="px-4 py-3">
                      {workflow.default_department_id
                        ? departmentNameById.get(String(workflow.default_department_id)) ?? `#${workflow.default_department_id}`
                        : "-"}
                    </td>
                    <td className="px-4 py-3">{workflow.priority}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2 py-1 text-[11px] ${
                          workflow.is_active
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                        }`}
                      >
                        {workflow.is_active ? "active" : "inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 px-2 py-1 text-[11px]"
                          onClick={() => openEdit(workflow)}
                          disabled={saving}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-rose-200 px-2 py-1 text-[11px] text-rose-600"
                          onClick={() => deleteWorkflow(workflow.workflow_id)}
                          disabled={saving}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No triage workflows yet"
            description="Create workflow rules to route reports automatically to the right department."
            actionLabel="Create workflow"
          />
        )}
      </SectionCard>

      <Modal
        open={open}
        title={form.workflow_id ? "Edit triage workflow" : "Create triage workflow"}
        description="Set scope conditions, preprocessing, allowed actions, and deadlines."
        onClose={() => setOpen(false)}
        size="2xl"
        bodyClassName="max-h-[78vh] overflow-y-auto"
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
              onClick={saveWorkflow}
              disabled={saving}
            >
              {form.workflow_id ? "Save changes" : "Create workflow"}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-500">Name</label>
              <input
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Report type</label>
              <input
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.report_type}
                onChange={(event) => setForm((prev) => ({ ...prev, report_type: event.target.value }))}
                placeholder="default"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500">Description</label>
            <textarea
              rows={3}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-xs font-semibold text-slate-500">Priority (lower = first)</label>
              <input
                type="number"
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.priority}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    priority: Number(event.target.value) || 100,
                  }))
                }
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Default department</label>
              <select
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.default_department_id}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, default_department_id: event.target.value }))
                }
              >
                <option value="">None</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, is_active: event.target.checked }))
                  }
                />
                Active workflow
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-900">Matching conditions</p>
            <div className="mt-3 grid gap-4 lg:grid-cols-2">
              <MultiSelectChips
                label="Countries"
                options={countries}
                selected={form.country_codes}
                onToggle={(id) => toggleInForm("country_codes", id)}
              />
              <MultiSelectChips
                label="Languages"
                options={languages}
                selected={form.language_codes}
                onToggle={(id) => toggleInForm("language_codes", id)}
              />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <MultiSelectChips
                label="Risk categories"
                options={riskCategories}
                selected={form.risk_category_ids}
                onToggle={(id) => toggleInForm("risk_category_ids", id)}
              />
              <MultiSelectChips
                label="Risk sub-categories"
                options={riskSubCategories}
                selected={form.risk_subcategory_ids}
                onToggle={(id) => toggleInForm("risk_subcategory_ids", id)}
              />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <MultiSelectChips
                label="Suppliers / related orgs"
                options={suppliers}
                selected={form.supplier_org_ids}
                onToggle={(id) => toggleInForm("supplier_org_ids", id)}
                emptyLabel="No related organisations found."
              />
              <MultiSelectChips
                label="Worksites"
                options={worksites}
                selected={form.worksite_ids}
                onToggle={(id) => toggleInForm("worksite_ids", id)}
                emptyLabel="No worksites found."
              />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <MultiSelectChips
                label="Severity levels"
                options={severityOptions}
                selected={form.severity_levels}
                onToggle={(id) => toggleInForm("severity_levels", id)}
              />
              <div>
                <label className="text-xs font-semibold text-slate-500">Membership tags (comma separated)</label>
                <input
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={form.membership_tags}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, membership_tags: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <div>
                <label className="text-xs font-semibold text-slate-500">Reporter min age</label>
                <input
                  type="number"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={form.reporter_min_age}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, reporter_min_age: event.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Reporter max age</label>
                <input
                  type="number"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={form.reporter_max_age}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, reporter_max_age: event.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Form key</label>
                <input
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={form.form_key}
                  onChange={(event) => setForm((prev) => ({ ...prev, form_key: event.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-900">Pre-processing config</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {[
                ["enable_ai_spam_filter", "Enable AI spam filtration"],
                ["enable_auto_translate", "Enable auto-translation"],
                ["enable_ai_out_of_scope", "Enable AI out-of-scope filter"],
                ["enable_ai_risk_analysis", "Enable AI risk analysis"],
                ["enable_human_translator", "Enable human translator fallback"],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={Boolean(form[key as keyof FormState])}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        [key]: event.target.checked,
                      }))
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-900">Status + action permissions</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={form.allow_select_result}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, allow_select_result: event.target.checked }))
                  }
                />
                Allow result selection in pre-evaluation
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={form.allow_comment}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, allow_comment: event.target.checked }))
                  }
                />
                Allow comments/communication
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={form.allow_manage_actions}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, allow_manage_actions: event.target.checked }))
                  }
                />
                Allow action management
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={form.allow_change_status}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, allow_change_status: event.target.checked }))
                  }
                />
                Allow status changes
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-600 md:col-span-2">
                <input
                  type="checkbox"
                  checked={form.require_reporter_update_on_status_change}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      require_reporter_update_on_status_change: event.target.checked,
                    }))
                  }
                />
                Require reporter update when status changes
              </label>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <MultiSelectChips
                label="Allowed filter results"
                options={filterResultOptions}
                selected={form.allowed_filter_results}
                onToggle={(id) => toggleInForm("allowed_filter_results", id)}
              />
              <MultiSelectChips
                label="Allowed status codes"
                options={statusCodes}
                selected={form.allowed_status_codes}
                onToggle={(id) => toggleInForm("allowed_status_codes", id)}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-900">Deadline settings</p>
            <div className="mt-3 grid gap-4 md:grid-cols-3">
              <div className="md:col-span-3">
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={form.use_workflow_deadlines}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        use_workflow_deadlines: event.target.checked,
                      }))
                    }
                  />
                  Override organization default deadlines
                </label>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">First response (hours)</label>
                <input
                  type="number"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={form.first_response_hours}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, first_response_hours: event.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Investigation (days)</label>
                <input
                  type="number"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={form.investigation_days}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, investigation_days: event.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Remediation (days)</label>
                <input
                  type="number"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={form.remediation_days}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, remediation_days: event.target.value }))
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {error ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      ) : null}
    </>
  );
}
