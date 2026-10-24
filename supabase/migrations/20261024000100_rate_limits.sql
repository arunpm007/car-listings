-- Limits for the public forms (sell request, password reset). The check and the record happen
-- in one locked step, so a burst of requests sent at the same moment can't all slip through.
create table public.rate_limit_hits (
  bucket text not null,
  created_at timestamptz not null default now()
);
create index rate_limit_hits_bucket_idx on public.rate_limit_hits (bucket, created_at desc);

-- Nobody reads or writes this table directly; only the function below, run by the server.
alter table public.rate_limit_hits enable row level security;

-- True (and counted) if this bucket has had fewer than `max_hits` in the last `window_secs`.
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
  delete from public.rate_limit_hits h where h.bucket = take_rate_limit.bucket and h.created_at < now() - interval '1 day';
  select count(*) into recent from public.rate_limit_hits h
    where h.bucket = take_rate_limit.bucket and h.created_at > now() - make_interval(secs => window_secs);
  if recent >= max_hits then
    return false;
  end if;
  insert into public.rate_limit_hits (bucket) values (take_rate_limit.bucket);
  return true;
end;
$$;

revoke all on function public.take_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.take_rate_limit(text, integer, integer) to service_role;

-- Phone photos are resized in the browser to well under this; anything bigger isn't from the form.
update storage.buckets set file_size_limit = 3145728 where id = 'request-photos';
