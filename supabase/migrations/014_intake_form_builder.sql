-- Intake form builder (no-code) core model

create table if not exists intake_form_configs (
  id bigserial primary key,
  config_key text not null default 'default',
  name text not null default 'Default Intake Form',
  country_id bigint null references countries(country_id) on delete set null,
  program_code text null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  version integer not null default 1,
  is_active boolean not null default false,
  created_by_user uuid null references user_profiles(user_id) on delete set null,
  published_by_user uuid null references user_profiles(user_id) on delete set null,
  published_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists intake_form_fields (
  id bigserial primary key,
  config_id bigint not null references intake_form_configs(id) on delete cascade,
  field_key text not null,
  source text not null default 'core' check (source in ('core', 'custom')),
  field_type text not null,
  step_key text not null,
  order_index integer not null default 0,
  is_enabled boolean not null default true,
  is_required boolean not null default false,
  options_json jsonb not null default '[]'::jsonb,
  validation_json jsonb not null default '{}'::jsonb,
  mapping_target text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (config_id, field_key)
);

create table if not exists intake_form_conditions (
  id bigserial primary key,
  config_id bigint not null references intake_form_configs(id) on delete cascade,
  target_field_key text not null,
  effect text not null check (effect in ('show', 'hide', 'required', 'optional')),
  rule_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists intake_form_translations (
  id bigserial primary key,
  config_id bigint not null references intake_form_configs(id) on delete cascade,
  field_key text not null,
  lang_code text not null,
  label text null,
  help_text text null,
  placeholder text null,
  option_labels_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (config_id, field_key, lang_code)
);

create index if not exists intake_form_configs_scope_idx
  on intake_form_configs (country_id, program_code, status, is_active, version desc);

create unique index if not exists intake_form_configs_single_active_published_idx
  on intake_form_configs (
    coalesce(country_id, 0),
    coalesce(program_code, ''),
    config_key
  )
  where status = 'published' and is_active = true;

create index if not exists intake_form_fields_config_step_order_idx
  on intake_form_fields (config_id, step_key, order_index, field_key);

create index if not exists intake_form_conditions_config_target_idx
  on intake_form_conditions (config_id, target_field_key);

create index if not exists intake_form_translations_config_lang_idx
  on intake_form_translations (config_id, lang_code, field_key);

create or replace function set_intake_form_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_intake_form_configs_updated_at on intake_form_configs;
create trigger trg_intake_form_configs_updated_at
before update on intake_form_configs
for each row execute function set_intake_form_updated_at();

drop trigger if exists trg_intake_form_fields_updated_at on intake_form_fields;
create trigger trg_intake_form_fields_updated_at
before update on intake_form_fields
for each row execute function set_intake_form_updated_at();

drop trigger if exists trg_intake_form_conditions_updated_at on intake_form_conditions;
create trigger trg_intake_form_conditions_updated_at
before update on intake_form_conditions
for each row execute function set_intake_form_updated_at();

drop trigger if exists trg_intake_form_translations_updated_at on intake_form_translations;
create trigger trg_intake_form_translations_updated_at
before update on intake_form_translations
for each row execute function set_intake_form_updated_at();

alter table reports
  add column if not exists intake_form_config_id bigint references intake_form_configs(id),
  add column if not exists intake_form_version integer;

-- Resolve best active published form for country/program with fallback to global default.
create or replace function public.get_active_intake_form_config(
  p_country_id bigint default null,
  p_program_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config_id bigint;
  v_result jsonb;
begin
  select c.id
    into v_config_id
  from intake_form_configs c
  where c.status = 'published'
    and c.is_active = true
    and (c.country_id = p_country_id or c.country_id is null)
    and (
      c.program_code is null
      or (p_program_code is not null and c.program_code = p_program_code)
    )
  order by
    (case when c.country_id is not null and c.country_id = p_country_id then 1 else 0 end) desc,
    (case when c.program_code is not null and p_program_code is not null and c.program_code = p_program_code then 1 else 0 end) desc,
    c.version desc,
    c.id desc
  limit 1;

  if v_config_id is null then
    return null;
  end if;

  select jsonb_build_object(
    'config', to_jsonb(c),
    'fields', coalesce((
      select jsonb_agg(to_jsonb(f) order by f.step_key, f.order_index, f.field_key)
      from intake_form_fields f
      where f.config_id = c.id
    ), '[]'::jsonb),
    'conditions', coalesce((
      select jsonb_agg(to_jsonb(cd) order by cd.id)
      from intake_form_conditions cd
      where cd.config_id = c.id
    ), '[]'::jsonb),
    'translations', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.lang_code, t.field_key)
      from intake_form_translations t
      where t.config_id = c.id
    ), '[]'::jsonb)
  )
  into v_result
  from intake_form_configs c
  where c.id = v_config_id;

  return v_result;
end;
$$;

grant execute on function public.get_active_intake_form_config(bigint, text) to anon;
grant execute on function public.get_active_intake_form_config(bigint, text) to authenticated;

-- Seed initial published config mirroring current intake structure if none exists.
do $$
declare
  v_config_id bigint;
begin
  if not exists (select 1 from intake_form_configs where config_key = 'default' and version = 1) then
    insert into intake_form_configs (
      config_key,
      name,
      country_id,
      program_code,
      status,
      version,
      is_active
    ) values (
      'default',
      'Default Intake Form',
      null,
      null,
      'published',
      1,
      true
    ) returning id into v_config_id;

    insert into intake_form_fields (
      config_id, field_key, source, field_type, step_key, order_index, is_enabled, is_required, mapping_target
    ) values
      (v_config_id, 'formCountry', 'core', 'select', 'step_1', 10, true, true, 'reports.country'),
      (v_config_id, 'formLanguage', 'core', 'select', 'step_1', 20, true, true, 'reports.original_language'),
      (v_config_id, 'useDifferentInputLanguage', 'core', 'checkbox', 'step_1', 25, true, false, 'intake_payload.use_different_input_language'),
      (v_config_id, 'inputLanguage', 'core', 'select', 'step_1', 30, true, false, 'reports.original_language'),
      (v_config_id, 'procedureType', 'core', 'radio', 'step_1', 40, true, true, 'intake_payload.procedure_type'),

      (v_config_id, 'acceptPrivacy', 'core', 'checkbox', 'step_2', 10, true, true, 'intake_payload.accept_privacy'),
      (v_config_id, 'acceptDataShare', 'core', 'checkbox', 'step_2', 20, true, true, 'intake_payload.accept_data_share'),
      (v_config_id, 'acceptDataTransfer', 'core', 'checkbox', 'step_2', 30, true, true, 'intake_payload.accept_data_transfer'),
      (v_config_id, 'acceptSensitive', 'core', 'checkbox', 'step_2', 40, true, true, 'intake_payload.accept_sensitive'),
      (v_config_id, 'acceptProcedureRules', 'core', 'checkbox', 'step_2', 50, true, true, 'intake_payload.accept_procedure_rules'),

      (v_config_id, 'isAnonymous', 'core', 'checkbox', 'step_3', 10, true, true, 'reports.is_anonymous'),
      (v_config_id, 'reporterEmail', 'core', 'email', 'step_3', 20, true, false, 'reports.reporter_email'),
      (v_config_id, 'reporterPassword', 'core', 'password', 'step_3', 30, true, false, 'intake_payload.reporter_password'),
      (v_config_id, 'reporterName', 'core', 'text', 'step_3', 40, true, false, 'intake_payload.reporter_name'),
      (v_config_id, 'reporterPhone', 'core', 'text', 'step_3', 50, true, false, 'intake_payload.reporter_phone'),
      (v_config_id, 'reporterCountry', 'core', 'text', 'step_3', 60, true, false, 'intake_payload.reporter_country'),
      (v_config_id, 'reporterAge', 'core', 'number', 'step_3', 70, true, false, 'intake_payload.reporter_age'),
      (v_config_id, 'reporterGender', 'core', 'select', 'step_3', 80, true, false, 'intake_payload.reporter_gender'),
      (v_config_id, 'reportingForSomeoneElse', 'core', 'checkbox', 'step_3', 90, true, false, 'intake_payload.reporting_for_someone_else'),
      (v_config_id, 'representativeRelation', 'core', 'text', 'step_3', 100, true, false, 'intake_payload.representative_relation'),
      (v_config_id, 'representativeReason', 'core', 'text', 'step_3', 110, true, false, 'intake_payload.representative_reason'),
      (v_config_id, 'representedEmail', 'core', 'email', 'step_3', 120, true, false, 'intake_payload.represented_email'),
      (v_config_id, 'representedName', 'core', 'text', 'step_3', 130, true, false, 'intake_payload.represented_name'),
      (v_config_id, 'representedPhone', 'core', 'text', 'step_3', 140, true, false, 'intake_payload.represented_phone'),

      (v_config_id, 'incidentCompany', 'core', 'select', 'step_4', 10, true, true, 'reports.reported_org_id'),
      (v_config_id, 'incidentCompanyEmployment', 'core', 'radio', 'step_4', 20, true, true, 'intake_payload.incident_company_employment'),
      (v_config_id, 'worksiteId', 'core', 'select', 'step_4', 30, true, false, 'intake_payload.worksite_id'),
      (v_config_id, 'worksitedEmployee', 'core', 'radio', 'step_4', 40, true, true, 'intake_payload.worksite_employee_status'),

      (v_config_id, 'ngoRepresentation', 'core', 'radio', 'step_5', 10, true, true, 'intake_payload.ngo_representation'),
      (v_config_id, 'ngoName', 'core', 'text', 'step_5', 20, true, false, 'intake_payload.ngo_name'),
      (v_config_id, 'ngoContact', 'core', 'text', 'step_5', 30, true, false, 'intake_payload.ngo_contact'),
      (v_config_id, 'ngoSupportDetails', 'core', 'textarea', 'step_5', 40, true, false, 'intake_payload.ngo_support_details'),

      (v_config_id, 'alertDirectCustomers', 'core', 'radio', 'step_6', 10, true, true, 'reports.alert_direct_suppliers'),
      (v_config_id, 'directCustomerTargets', 'core', 'multiselect', 'step_6', 20, true, false, 'intake_payload.direct_customer_targets'),
      (v_config_id, 'alertIndirectCustomers', 'core', 'radio', 'step_6', 30, true, true, 'reports.alert_indirect_suppliers'),
      (v_config_id, 'indirectCustomerTargets', 'core', 'multiselect', 'step_6', 40, true, false, 'intake_payload.indirect_customer_targets'),

      (v_config_id, 'incidentType', 'core', 'radio', 'step_7', 10, true, true, 'intake_payload.incident_type'),
      (v_config_id, 'subject', 'core', 'text', 'step_7', 20, true, true, 'reports.title'),
      (v_config_id, 'description', 'core', 'textarea', 'step_7', 30, true, true, 'reports.description'),
      (v_config_id, 'incidentStartDate', 'core', 'date', 'step_7', 40, true, true, 'reports.incident_date'),
      (v_config_id, 'incidentStartTime', 'core', 'time', 'step_7', 50, true, false, 'intake_payload.incident_start_time'),
      (v_config_id, 'incidentIsContinuing', 'core', 'checkbox', 'step_7', 60, true, false, 'reports.is_incident_is_continuing'),
      (v_config_id, 'incidentEndDate', 'core', 'date', 'step_7', 70, true, false, 'intake_payload.incident_end_date'),
      (v_config_id, 'incidentEndTime', 'core', 'time', 'step_7', 80, true, false, 'intake_payload.incident_end_time'),
      (v_config_id, 'addressedBefore', 'core', 'radio', 'step_7', 90, true, true, 'intake_payload.addressed_before'),
      (v_config_id, 'legalStepsTaken', 'core', 'radio', 'step_7', 100, true, true, 'reports.legal_steps_taken'),
      (v_config_id, 'legalStepsDetails', 'core', 'textarea', 'step_7', 110, true, false, 'reports.legal_steps_taken'),
      (v_config_id, 'riskCategory', 'core', 'select', 'step_7', 120, true, true, 'intake_payload.risk_category'),
      (v_config_id, 'riskSubCategory', 'core', 'select', 'step_7', 130, true, false, 'intake_payload.risk_sub_category'),
      (v_config_id, 'remedy', 'core', 'textarea', 'step_7', 140, true, false, 'reports.suggested_remedy'),
      (v_config_id, 'attachments', 'core', 'file', 'step_7', 150, true, false, 'intake_payload.attachments');
  end if;
end $$;
