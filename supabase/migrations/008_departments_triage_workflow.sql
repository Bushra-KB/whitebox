-- Departments + Triage workflow (Org-level)

create table if not exists organization_departments (
  department_id bigserial primary key,
  organization_id bigint not null references organisations(organization_id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  priority integer not null default 100,
  scope_risk_category_ids bigint[] not null default '{}',
  scope_risk_subcategory_ids bigint[] not null default '{}',
  scope_country_codes text[] not null default '{}',
  scope_supplier_org_ids bigint[] not null default '{}',
  scope_worksite_ids bigint[] not null default '{}',
  created_by_user uuid references user_profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists organization_department_members (
  department_id bigint not null references organization_departments(department_id) on delete cascade,
  user_id uuid not null references user_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (department_id, user_id)
);

create table if not exists triage_workflows (
  workflow_id bigserial primary key,
  organization_id bigint not null references organisations(organization_id) on delete cascade,
  name text not null,
  description text,
  report_type text not null default 'default',
  priority integer not null default 100,
  is_active boolean not null default true,
  default_department_id bigint references organization_departments(department_id) on delete set null,
  preprocessing_config jsonb not null default '{}'::jsonb,
  status_action_config jsonb not null default '{}'::jsonb,
  deadline_config jsonb not null default '{}'::jsonb,
  created_by_user uuid references user_profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists triage_workflow_conditions (
  condition_id bigserial primary key,
  workflow_id bigint not null unique references triage_workflows(workflow_id) on delete cascade,
  country_codes text[] not null default '{}',
  language_codes text[] not null default '{}',
  risk_category_ids bigint[] not null default '{}',
  risk_subcategory_ids bigint[] not null default '{}',
  supplier_org_ids bigint[] not null default '{}',
  worksite_ids bigint[] not null default '{}',
  reporter_min_age integer,
  reporter_max_age integer,
  severity_levels integer[] not null default '{}',
  membership_tags text[] not null default '{}',
  form_key text
);

create table if not exists report_triage_assignments (
  assignment_id bigserial primary key,
  report_id bigint not null unique references reports(report_id) on delete cascade,
  organization_id bigint not null references organisations(organization_id) on delete cascade,
  workflow_id bigint references triage_workflows(workflow_id) on delete set null,
  department_id bigint references organization_departments(department_id) on delete set null,
  assignment_reason jsonb not null default '{}'::jsonb,
  assigned_by text not null default 'system',
  assigned_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists report_triage_assignment_logs (
  log_id bigserial primary key,
  report_id bigint not null references reports(report_id) on delete cascade,
  workflow_id bigint references triage_workflows(workflow_id) on delete set null,
  department_id bigint references organization_departments(department_id) on delete set null,
  event_type text not null,
  reason jsonb,
  changed_by_user uuid references user_profiles(user_id),
  created_at timestamptz not null default now()
);

alter table reports
  add column if not exists triage_workflow_id bigint references triage_workflows(workflow_id) on delete set null,
  add column if not exists assigned_department_id bigint references organization_departments(department_id) on delete set null;

create index if not exists organization_departments_org_idx
  on organization_departments(organization_id, is_active, priority);
create index if not exists department_members_user_idx
  on organization_department_members(user_id);
create index if not exists triage_workflows_org_idx
  on triage_workflows(organization_id, is_active, priority);
create index if not exists report_triage_assignments_org_idx
  on report_triage_assignments(organization_id, assigned_at desc);
create index if not exists report_triage_logs_report_idx
  on report_triage_assignment_logs(report_id, created_at desc);

create or replace function set_row_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_dept_updated_at on organization_departments;
create trigger trg_dept_updated_at
before update on organization_departments
for each row execute function set_row_updated_at();

drop trigger if exists trg_triage_workflow_updated_at on triage_workflows;
create trigger trg_triage_workflow_updated_at
before update on triage_workflows
for each row execute function set_row_updated_at();

drop trigger if exists trg_triage_assignment_updated_at on report_triage_assignments;
create trigger trg_triage_assignment_updated_at
before update on report_triage_assignments
for each row execute function set_row_updated_at();

create or replace function assign_report_triage(
  p_report_id bigint,
  p_assigned_by text default 'system'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report reports%rowtype;
  v_risk_category_ids bigint[] := '{}';
  v_risk_subcategory_ids bigint[] := '{}';
  v_worksite_id bigint := null;
  v_supplier_org_id bigint := null;
  v_workflow triage_workflows%rowtype;
  v_condition triage_workflow_conditions%rowtype;
  v_department_id bigint := null;
  v_match boolean;
  v_reason jsonb := '{}'::jsonb;
begin
  select * into v_report
  from reports
  where report_id = p_report_id;

  if not found or v_report.reported_org_id is null then
    return;
  end if;

  select
    coalesce(array_agg(distinct category_id) filter (where category_id is not null), '{}'),
    coalesce(array_agg(distinct sub_category_id) filter (where sub_category_id is not null), '{}')
  into v_risk_category_ids, v_risk_subcategory_ids
  from report_risk_categories
  where report_id = p_report_id;

  begin
    if v_report.intake_payload is not null then
      v_worksite_id := nullif((v_report.intake_payload->>'worksite_id')::bigint, 0);
      v_supplier_org_id := nullif((v_report.intake_payload->>'supplier_org_id')::bigint, 0);
    end if;
  exception when others then
    v_worksite_id := null;
    v_supplier_org_id := null;
  end;

  for v_workflow in
    select *
    from triage_workflows
    where organization_id = v_report.reported_org_id
      and is_active = true
    order by priority asc, workflow_id asc
  loop
    select * into v_condition
    from triage_workflow_conditions
    where workflow_id = v_workflow.workflow_id;

    v_match := true;

    if found then
      if array_length(v_condition.country_codes, 1) is not null
         and array_length(v_condition.country_codes, 1) > 0
         and (v_report.country is null or not (v_report.country = any(v_condition.country_codes))) then
        v_match := false;
      end if;

      if v_match
         and array_length(v_condition.language_codes, 1) is not null
         and array_length(v_condition.language_codes, 1) > 0
         and (v_report.original_language is null or not (v_report.original_language = any(v_condition.language_codes))) then
        v_match := false;
      end if;

      if v_match
         and array_length(v_condition.risk_category_ids, 1) is not null
         and array_length(v_condition.risk_category_ids, 1) > 0
         and not (v_risk_category_ids && v_condition.risk_category_ids) then
        v_match := false;
      end if;

      if v_match
         and array_length(v_condition.risk_subcategory_ids, 1) is not null
         and array_length(v_condition.risk_subcategory_ids, 1) > 0
         and not (v_risk_subcategory_ids && v_condition.risk_subcategory_ids) then
        v_match := false;
      end if;

      if v_match
         and array_length(v_condition.severity_levels, 1) is not null
         and array_length(v_condition.severity_levels, 1) > 0
         and (v_report.severity_level is null or not (v_report.severity_level = any(v_condition.severity_levels))) then
        v_match := false;
      end if;

      if v_match
         and array_length(v_condition.worksite_ids, 1) is not null
         and array_length(v_condition.worksite_ids, 1) > 0
         and (v_worksite_id is null or not (v_worksite_id = any(v_condition.worksite_ids))) then
        v_match := false;
      end if;

      if v_match
         and array_length(v_condition.supplier_org_ids, 1) is not null
         and array_length(v_condition.supplier_org_ids, 1) > 0
         and (v_supplier_org_id is null or not (v_supplier_org_id = any(v_condition.supplier_org_ids))) then
        v_match := false;
      end if;
    end if;

    if v_match then
      v_reason := jsonb_build_object('workflow_match', true, 'workflow_id', v_workflow.workflow_id);
      exit;
    end if;
  end loop;

  if v_workflow.workflow_id is null then
    v_reason := jsonb_build_object('workflow_match', false, 'fallback', 'no_active_workflow');
  end if;

  if v_workflow.default_department_id is not null then
    select department_id
      into v_department_id
    from organization_departments
    where department_id = v_workflow.default_department_id
      and organization_id = v_report.reported_org_id
      and is_active = true
    limit 1;
  end if;

  if v_department_id is null then
    select d.department_id
      into v_department_id
    from organization_departments d
    where d.organization_id = v_report.reported_org_id
      and d.is_active = true
      and (
        array_length(d.scope_country_codes, 1) is null
        or array_length(d.scope_country_codes, 1) = 0
        or (v_report.country is not null and v_report.country = any(d.scope_country_codes))
      )
      and (
        array_length(d.scope_risk_category_ids, 1) is null
        or array_length(d.scope_risk_category_ids, 1) = 0
        or v_risk_category_ids && d.scope_risk_category_ids
      )
      and (
        array_length(d.scope_risk_subcategory_ids, 1) is null
        or array_length(d.scope_risk_subcategory_ids, 1) = 0
        or v_risk_subcategory_ids && d.scope_risk_subcategory_ids
      )
      and (
        array_length(d.scope_worksite_ids, 1) is null
        or array_length(d.scope_worksite_ids, 1) = 0
        or (v_worksite_id is not null and v_worksite_id = any(d.scope_worksite_ids))
      )
      and (
        array_length(d.scope_supplier_org_ids, 1) is null
        or array_length(d.scope_supplier_org_ids, 1) = 0
        or (v_supplier_org_id is not null and v_supplier_org_id = any(d.scope_supplier_org_ids))
      )
    order by d.priority asc, d.department_id asc
    limit 1;
  end if;

  update reports
  set
    triage_workflow_id = v_workflow.workflow_id,
    assigned_department_id = v_department_id
  where report_id = p_report_id;

  insert into report_triage_assignments (
    report_id, organization_id, workflow_id, department_id, assignment_reason, assigned_by
  )
  values (
    p_report_id, v_report.reported_org_id, v_workflow.workflow_id, v_department_id, v_reason, p_assigned_by
  )
  on conflict (report_id)
  do update set
    workflow_id = excluded.workflow_id,
    department_id = excluded.department_id,
    assignment_reason = excluded.assignment_reason,
    assigned_by = excluded.assigned_by,
    assigned_at = now();

  insert into report_triage_assignment_logs (
    report_id, workflow_id, department_id, event_type, reason, changed_by_user
  )
  values (
    p_report_id,
    v_workflow.workflow_id,
    v_department_id,
    'assigned',
    v_reason,
    (select user_id from user_profiles where auth_user_id = auth.uid() limit 1)
  );
end;
$$;

create or replace function assign_org_reports_triage(
  p_organization_id bigint,
  p_only_unassigned boolean default true
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report_id bigint;
  v_count integer := 0;
begin
  for v_report_id in
    select r.report_id
    from reports r
    where r.reported_org_id = p_organization_id
      and (
        p_only_unassigned = false
        or r.assigned_department_id is null
        or r.triage_workflow_id is null
      )
  loop
    perform assign_report_triage(v_report_id, 'manual_rebuild');
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

create or replace function trigger_assign_report_triage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform assign_report_triage(new.report_id, 'trigger');
  return new;
end;
$$;

drop trigger if exists trg_assign_report_triage on reports;
create trigger trg_assign_report_triage
after insert or update of reported_org_id, country, original_language, severity_level, intake_payload
on reports
for each row
execute function trigger_assign_report_triage();

grant execute on function assign_report_triage(bigint, text) to authenticated;
grant execute on function assign_org_reports_triage(bigint, boolean) to authenticated;
