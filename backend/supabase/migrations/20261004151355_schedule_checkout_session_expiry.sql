-- Automatically expire unpaid checkout sessions and release reserved stock.
create extension if not exists pg_cron;

select cron.unschedule(jobid)
from cron.job
where jobname = 'loka-expire-checkout-sessions';

select cron.schedule(
  'loka-expire-checkout-sessions',
  '* * * * *',
  'select public.expire_checkout_sessions();'
);
