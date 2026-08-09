-- ---------------------------------------------------------------------
-- One open payment per enrolment.
--
-- A student could submit the same payment repeatedly. Three things let it
-- happen, and this file closes the one that matters most.
--
--   1. Cash payments have no transaction id to quote, so the code generated
--      a fresh random tran_id each time. The unique constraint on tran_id
--      therefore never fired.
--   2. The checkout page did check for an existing pending payment, but
--      with .maybeSingle(), which errors once two rows match. The first
--      duplicate broke the guard and every later attempt sailed through.
--   3. Nothing in the database said "only one".
--
-- Application checks race and can be bypassed; the index cannot. Run this
-- once, in the Supabase SQL editor.
-- ---------------------------------------------------------------------

-- Step 1 — retire the duplicates already recorded.
--
-- Cancelled rather than deleted: these are things real students did, and an
-- admin reviewing the account should be able to see what happened rather
-- than find rows silently missing. For each enrolment keep one row — a
-- confirmed payment if there is one, otherwise the earliest submission.
with ranked as (
  select
    id,
    row_number() over (
      partition by enrollment_id
      order by (status = 'paid') desc, created_at asc
    ) as rn
  from public.payments
  where status in ('pending_review', 'paid')
)
update public.payments as p
set
  status = 'cancelled',
  meta = p.meta || jsonb_build_object('cancelled_reason', 'duplicate_submission'),
  updated_at = now()
from ranked as r
where p.id = r.id
  and r.rn > 1;

-- Step 2 — make it impossible from here on.
--
-- Only 'pending_review' and 'paid' are covered. A student whose transfer was
-- rejected (cancelled/failed) must be able to submit again, and a gateway
-- attempt that never completed ('initiated') must be retryable — neither
-- should be blocked by a row that went nowhere.
create unique index if not exists payments_one_open_per_enrollment
  on public.payments (enrollment_id)
  where status in ('pending_review', 'paid');

-- What is left, per enrolment: at most one payment awaiting review or
-- confirmed, plus any number of historical failed/cancelled/refunded rows.
