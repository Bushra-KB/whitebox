-- Fix actor foreign keys: use user_profiles.user_id (not auth.uid()).

create or replace function log_report_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user uuid;
begin
  select user_id
    into v_actor_user
  from user_profiles
  where auth_user_id = auth.uid();

  if tg_op = 'INSERT' then
    if new.status_id is not null then
      insert into report_status_history (report_id, status_id, changed_by_user, comment_text)
      values (new.report_id, new.status_id, v_actor_user, null);
    end if;
    return new;
  end if;

  if new.status_id is distinct from old.status_id then
    insert into report_status_history (report_id, status_id, changed_by_user, comment_text)
    values (new.report_id, new.status_id, v_actor_user, null);
  end if;

  return new;
end;
$$;

create or replace function apply_report_filter_decision(
  p_report_id bigint,
  p_result_code text,
  p_reasoning text default null,
  p_is_auto boolean default false,
  p_needs_super_review boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result_id bigint;
  v_target_status_id bigint;
  v_actor_user uuid;
begin
  select user_id
    into v_actor_user
  from user_profiles
  where auth_user_id = auth.uid();

  select result_id into v_result_id
  from report_filter_results
  where code = p_result_code;

  if v_result_id is null then
    raise exception 'Unknown filter result: %', p_result_code;
  end if;

  select status_id into v_target_status_id
  from report_statuses
  where code = case
    when p_result_code = 'admitted' then 'waiting_admitted'
    else 'archived'
  end;

  if v_target_status_id is null then
    raise exception 'Target status not configured';
  end if;

  insert into report_filter_decisions (
    report_id,
    result_id,
    decided_by_user,
    reasoning,
    is_auto,
    needs_super_review
  ) values (
    p_report_id,
    v_result_id,
    v_actor_user,
    p_reasoning,
    p_is_auto,
    p_needs_super_review
  );

  update reports
  set
    status_id = v_target_status_id,
    current_filter_result_id = v_result_id,
    is_spam = case when p_result_code = 'spam' then true else coalesce(is_spam, false) end,
    need_super_admin_review = p_needs_super_review
  where report_id = p_report_id;
end;
$$;
