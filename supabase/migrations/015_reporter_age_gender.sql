alter table reports
  add column if not exists reporter_age integer,
  add column if not exists reporter_gender text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reports_reporter_age_range_chk'
  ) then
    alter table reports
      add constraint reports_reporter_age_range_chk
      check (reporter_age is null or (reporter_age >= 0 and reporter_age <= 120));
  end if;
end $$;
