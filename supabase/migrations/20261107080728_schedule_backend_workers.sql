create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create or replace function private.invoke_nobogey_worker(
  p_path text,
  p_secret_name text,
  p_secret_header text
) returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_url text;
  worker_secret text;
begin
  if p_path not in ('send-booking-emails', 'booking-maintenance')
     or p_secret_header not in ('x-dispatch-secret', 'x-maintenance-secret') then
    raise exception 'unsupported backend worker';
  end if;

  select decrypted_secret into project_url
  from vault.decrypted_secrets
  where name = 'nobogey_project_url';

  select decrypted_secret into worker_secret
  from vault.decrypted_secrets
  where name = p_secret_name;

  -- Preview environments do not receive production Vault values. A missing
  -- value therefore disables the worker instead of calling production.
  if project_url is null or worker_secret is null then
    return null;
  end if;
  if project_url !~ '^https://[a-z0-9.-]+$' then
    raise exception 'invalid worker project URL';
  end if;

  return net.http_post(
    url := project_url || '/functions/v1/' || p_path,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      p_secret_header, worker_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
end;
$$;

revoke all on function private.invoke_nobogey_worker(text, text, text)
from public, anon, authenticated, service_role;

-- Do not deliver historical booking emails after the worker is enabled. New
-- and future bookings remain eligible for normal retry processing.
update private.notification_outbox o
set delivery_status = 'failed',
    last_error = 'booking elapsed before email delivery',
    dead_lettered_at = now()
from public.bookings b
where b.id = o.booking_id
  and o.delivery_status in ('pending', 'failed')
  and o.dead_lettered_at is null
  and b.starts_at < now();

do $$
declare
  existing_job bigint;
begin
  select jobid into existing_job from cron.job where jobname = 'nobogey-booking-email-dispatch';
  if existing_job is not null then perform cron.unschedule(existing_job); end if;

  select jobid into existing_job from cron.job where jobname = 'nobogey-booking-maintenance';
  if existing_job is not null then perform cron.unschedule(existing_job); end if;
end;
$$;

select cron.schedule(
  'nobogey-booking-email-dispatch',
  '* * * * *',
  $job$select private.invoke_nobogey_worker('send-booking-emails', 'nobogey_outbox_dispatch_secret', 'x-dispatch-secret');$job$
);

select cron.schedule(
  'nobogey-booking-maintenance',
  '*/5 * * * *',
  $job$select private.invoke_nobogey_worker('booking-maintenance', 'nobogey_booking_maintenance_secret', 'x-maintenance-secret');$job$
);
