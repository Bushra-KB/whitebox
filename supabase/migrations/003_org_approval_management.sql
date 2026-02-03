alter table organisations
  add column if not exists approval_status text not null default 'pending',
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by_user uuid,
  add column if not exists removed_at timestamptz,
  add column if not exists removed_by_user uuid,
  add column if not exists removal_reason text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'organisations_approval_status_check'
  ) then
    alter table organisations
      add constraint organisations_approval_status_check
      check (approval_status in ('pending', 'approved', 'removed'));
  end if;
end $$;

update organisations
set approval_status = case when is_claimed then 'approved' else 'pending' end
where approval_status is null or approval_status not in ('pending', 'approved', 'removed');

update organisations
set approved_at = coalesce(approved_at, now())
where approval_status = 'approved' and approved_at is null;

create index if not exists organisations_approval_status_idx on organisations(approval_status);
