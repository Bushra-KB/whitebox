alter table organisations
  add column if not exists account_status text not null default 'inactive',
  add column if not exists blocked_at timestamptz,
  add column if not exists blocked_by_user uuid;

alter table organisations
  drop constraint if exists organisations_approval_status_check;

alter table organisations
  add constraint organisations_approval_status_check
  check (approval_status in ('pending', 'approved', 'blocked', 'removed'));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'organisations_account_status_check'
  ) then
    alter table organisations
      add constraint organisations_account_status_check
      check (account_status in ('active', 'inactive'));
  end if;
end $$;

update organisations
set account_status = case
  when approval_status = 'approved' then 'active'
  else 'inactive'
end
where account_status is null or account_status not in ('active', 'inactive');

create index if not exists organisations_account_status_idx on organisations(account_status);
