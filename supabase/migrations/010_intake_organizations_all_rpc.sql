create or replace function public.get_intake_organizations_all()
returns table (
  organization_id integer,
  name text,
  country text,
  city text,
  website text,
  organization_type text,
  approval_status text,
  account_status text
)
language sql
security definer
set search_path = public
as $$
  select
    o.organization_id,
    o.name,
    o.country,
    o.city,
    o.website,
    o.organization_type,
    o.approval_status,
    o.account_status
  from organisations o
  where o.name is not null
  order by o.name asc;
$$;

grant execute on function public.get_intake_organizations_all() to anon;
grant execute on function public.get_intake_organizations_all() to authenticated;
