-- Limit counts are only needed for a day. Clear every old row on each check (not only the
-- bucket being checked), so a phone or email bucket that never comes back doesn't linger.
-- The app now stores phone numbers and emails only as scrambled codes; drop any plain ones.
delete from public.rate_limit_hits where bucket like 'sell:phone:+%' or bucket like 'reset:email:%@%';

create or replace function public.take_rate_limit(bucket text, max_hits integer, window_secs integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent integer;
begin
  perform pg_advisory_xact_lock(hashtext(bucket));
  delete from public.rate_limit_hits h where h.created_at < now() - interval '1 day';
  select count(*) into recent from public.rate_limit_hits h
    where h.bucket = take_rate_limit.bucket and h.created_at > now() - make_interval(secs => window_secs);
  if recent >= max_hits then
    return false;
  end if;
  insert into public.rate_limit_hits (bucket) values (take_rate_limit.bucket);
  return true;
end;
$$;

-- create or replace keeps the existing grants, but restate them so this file reads complete.
revoke all on function public.take_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.take_rate_limit(text, integer, integer) to service_role;
