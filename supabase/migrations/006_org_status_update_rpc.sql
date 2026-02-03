-- Org/System status update helper to avoid client-side RLS write issues.

create or replace function set_report_status(
  p_report_id bigint,
  p_status_code text,
  p_comment text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status_id bigint;
  v_user_id uuid;
  v_user_type text;
  v_report_org_id bigint;
begin
  select user_id, user_type
    into v_user_id, v_user_type
  from user_profiles
  where auth_user_id = auth.uid();

  if v_user_id is null then
    raise exception 'User profile not found';
  end if;

  select reported_org_id
    into v_report_org_id
  from reports
  where report_id = p_report_id;

  if v_report_org_id is null then
    raise exception 'Report not found';
  end if;

  if v_user_type <> 'system_admin'
     and not exists (
       select 1
       from organization_users ou
       where ou.user_id = v_user_id
         and ou.organization_id = v_report_org_id
     ) then
    raise exception 'Not allowed to update this report';
  end if;

  select status_id
    into v_status_id
  from report_statuses
  where code = p_status_code;

  if v_status_id is null then
    raise exception 'Unknown status code: %', p_status_code;
  end if;

  update reports
  set status_id = v_status_id
  where report_id = p_report_id;

  if not found then
    raise exception 'Report not found';
  end if;

  if p_comment is not null and btrim(p_comment) <> '' then
    update report_status_history
    set comment_text = btrim(p_comment)
    where id = (
      select id
      from report_status_history
      where report_id = p_report_id
        and status_id = v_status_id
      order by changed_at desc
      limit 1
    );
  end if;
end;
$$;

grant execute on function set_report_status(bigint, text, text) to authenticated;
