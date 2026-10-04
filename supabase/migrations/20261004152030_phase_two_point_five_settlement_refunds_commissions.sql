-- LOKA Phase 2.5 settlement hardening, refunds, commissions and notifications.

do $do$
begin
  create type public.commission_status as enum ('pending','eligible','paid','reversed','partially_reversed');
exception when duplicate_object then null;
end $do$;

alter type public.commission_status add value if not exists 'partially_reversed';

do $do$
begin
  create type public.refund_status as enum ('pending','processing','needs_attention','processed','failed');
exception when duplicate_object then null;
end $$;

alter table public.commissions
  add column if not exists status public.commission_status not null default 'pending',
  add column if not exists refunded_amount numeric(14,2) not null default 0 check (refunded_amount >= 0),
  add column if not exists eligible_at timestamptz,
  add column if not exists paid_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists commissions_order_unique on public.commissions(order_id);

create table if not exists public.payment_refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'NGN',
  status public.refund_status not null default 'pending',
  provider_refund_id text unique,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payment_refunds enable row level security;
grant select on public.payment_refunds to authenticated;
grant all on public.payment_refunds to service_role;

drop policy if exists payment_refunds_participant_admin on public.payment_refunds;
create policy payment_refunds_participant_admin on public.payment_refunds
for select to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.buyer_id = (select auth.uid()) or o.seller_id = (select auth.uid()) or public.is_admin())
  )
  or public.is_admin()
);

create index if not exists payment_refunds_payment_idx on public.payment_refunds(payment_id, created_at desc);
create index if not exists payment_refunds_order_idx on public.payment_refunds(order_id, created_at desc);
create index if not exists commissions_seller_status_idx on public.commissions(seller_id, status, created_at desc);

create or replace function public.create_order_commission(p_order_id uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $
declare
  v_order public.orders%rowtype;
  v_rate numeric(5,2);
  v_commission numeric(14,2);
  v_seller_amount numeric(14,2);
  v_id uuid;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if v_order.id is null then raise exception 'Order not found'; end if;

  select commission_rate into v_rate from public.seller_profiles where user_id = v_order.seller_id;
  if v_rate is null then raise exception 'Seller commission rate not found'; end if;

  v_commission := round(v_order.total * v_rate / 100, 2);
  v_seller_amount := v_order.total - v_commission;

  insert into public.commissions(
    order_id, seller_id, gross_amount, commission_rate, commission_amount, seller_amount, status
  )
  values (
    v_order.id, v_order.seller_id, v_order.total, v_rate, v_commission, v_seller_amount,
    'pending'::public.commission_status
  )
  on conflict (order_id) do nothing
  returning id into v_id;

  return jsonb_build_object(
    'order_id', v_order.id,
    'commission_id', coalesce(v_id, (select id from public.commissions where order_id = v_order.id))
  );
end;
$$;

revoke execute on function public.create_order_commission(uuid) from public, anon, authenticated;
grant execute on function public.create_order_commission(uuid) to service_role;

create or replace function public.prepare_order_refund(
  p_order_id uuid,
  p_amount numeric,
  p_reason text default null
)
returns jsonb
language plpgsql security definer set search_path = ''
as $
declare
  v_order public.orders%rowtype;
  v_payment public.payments%rowtype;
  v_refunded numeric(14,2);
  v_amount numeric(14,2);
  v_refund public.payment_refunds%rowtype;
begin
  if p_amount is null or p_amount <= 0 then raise exception 'Refund amount must be greater than zero'; end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if v_order.id is null then raise exception 'Order not found'; end if;

  select p.* into v_payment
  from public.payments p
  left join public.payment_allocations pa on pa.payment_id = p.id and pa.order_id = p_order_id
  where p.status in ('paid'::public.payment_status, 'partially_refunded'::public.payment_status)
    and (p.order_id = p_order_id or pa.order_id is not null)
  order by p.created_at desc
  limit 1
  for update;

  if v_payment.id is null then raise exception 'No paid payment found for this order'; end if;

  v_amount := round(p_amount, 2);

  select coalesce(sum(pr.amount), 0)::numeric(14,2) into v_refunded
  from public.payment_refunds pr
  where pr.order_id = p_order_id
    and pr.status in (
      'pending'::public.refund_status,
      'processing'::public.refund_status,
      'needs_attention'::public.refund_status,
      'processed'::public.refund_status
    );

  if v_refunded + v_amount > v_order.total then
    raise exception 'Refund exceeds refundable order balance';
  end if;

  insert into public.payment_refunds(payment_id, order_id, amount, currency, status, reason)
  values(v_payment.id, p_order_id, v_amount, v_payment.currency, 'pending'::public.refund_status, p_reason)
  returning * into v_refund;

  return jsonb_build_object(
    'refund_id', v_refund.id, 'payment_id', v_refund.payment_id, 'order_id', v_refund.order_id,
    'amount', v_refund.amount, 'currency', v_refund.currency, 'status', v_refund.status
  );
end;
$$;

revoke execute on function public.prepare_order_refund(uuid,numeric,text) from public, anon, authenticated;
grant execute on function public.prepare_order_refund(uuid,numeric,text) to service_role;

create or replace function public.update_payment_refund(
  p_refund_id uuid,
  p_status public.refund_status,
  p_provider_refund_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql security definer set search_path = ''
as $
declare
  v_refund public.payment_refunds%rowtype;
  v_order public.orders%rowtype;
  v_payment public.payments%rowtype;
  v_commission public.commissions%rowtype;
  v_total_refunded numeric(14,2);
  v_payment_refunded numeric(14,2);
  v_commission_reversal numeric(14,2);
  v_seller_reversal numeric(14,2);
  v_previous_status public.refund_status;
begin
  select * into v_refund from public.payment_refunds where id = p_refund_id for update;
  if v_refund.id is null then raise exception 'Refund not found'; end if;
  v_previous_status := v_refund.status;

  update public.payment_refunds
  set status = p_status,
      provider_refund_id = coalesce(p_provider_refund_id, provider_refund_id),
      metadata = coalesce(p_metadata, '{}'::jsonb),
      processed_at = case when p_status = 'processed'::public.refund_status then now() else processed_at end,
      updated_at = now()
  where id = v_refund.id;

  if p_status = 'processed'::public.refund_status
     and v_previous_status <> 'processed'::public.refund_status then
    select * into v_order from public.orders where id = v_refund.order_id for update;
    select * into v_payment from public.payments where id = v_refund.payment_id for update;

    select coalesce(sum(pr.amount), 0)::numeric(14,2) into v_total_refunded
    from public.payment_refunds pr
    where pr.order_id = v_refund.order_id and pr.status = 'processed'::public.refund_status;

    select coalesce(sum(pr.amount), 0)::numeric(14,2) into v_payment_refunded
    from public.payment_refunds pr
    where pr.payment_id = v_refund.payment_id and pr.status = 'processed'::public.refund_status;

    if v_payment_refunded >= v_payment.amount then
      update public.payments set status = 'refunded'::public.payment_status, updated_at = now() where id = v_payment.id;
    elsif v_payment_refunded > 0 then
      update public.payments set status = 'partially_refunded'::public.payment_status, updated_at = now() where id = v_payment.id;
    end if;

    select * into v_commission from public.commissions where order_id = v_refund.order_id for update;

    if v_commission.id is not null then
      v_commission_reversal := round(v_refund.amount * v_commission.commission_rate / 100, 2);
      v_seller_reversal := v_refund.amount - v_commission_reversal;

      update public.commissions
      set refunded_amount = least(v_order.total, refunded_amount + v_refund.amount),
          commission_amount = greatest(0, commission_amount - v_commission_reversal),
          seller_amount = greatest(0, seller_amount - v_seller_reversal),
          status = case
            when v_total_refunded >= v_order.total then 'reversed'::public.commission_status
            when v_total_refunded > 0 then 'partially_reversed'::public.commission_status
            else status
          end,
          updated_at = now()
      where id = v_commission.id;
    end if;

    update public.orders
    set status = case when v_total_refunded >= v_order.total then 'refunded'::public.order_status else status end,
        updated_at = now()
    where id = v_order.id;

    insert into public.transactions(payment_id, order_id, user_id, type, amount, currency, reference, status, metadata)
    values(
      v_refund.payment_id, v_refund.order_id, v_order.buyer_id, 'refund', v_refund.amount, v_refund.currency,
      coalesce(v_refund.provider_refund_id, 'refund-' || v_refund.id::text), 'success', p_metadata
    )
    on conflict (reference) do update set status = 'success', metadata = excluded.metadata;

    insert into public.notifications(user_id, type, title, body, data)
    values(
      v_order.buyer_id, 'refund.processed', 'Refund processed',
      'Your refund has been processed.',
      jsonb_build_object('refund_id', v_refund.id, 'order_id', v_order.id, 'amount', v_refund.amount)
    );

    insert into public.notifications(user_id, type, title, body, data)
    values(
      v_order.seller_id, 'refund.processed', 'Order refund processed',
      'A refund has been processed against one of your orders.',
      jsonb_build_object('refund_id', v_refund.id, 'order_id', v_order.id, 'amount', v_refund.amount)
    );
  elsif p_status = 'failed'::public.refund_status
     and v_previous_status <> 'failed'::public.refund_status then
    insert into public.notifications(user_id, type, title, body, data)
    select o.buyer_id, 'refund.failed', 'Refund failed',
           'Your refund could not be processed. Please contact support.',
           jsonb_build_object('refund_id', v_refund.id, 'order_id', o.id, 'amount', v_refund.amount)
    from public.orders o where o.id = v_refund.order_id;
  end if;

  return jsonb_build_object('refund_id', v_refund.id, 'status', p_status);
end;
$$;

revoke execute on function public.update_payment_refund(uuid,public.refund_status,text,jsonb) from public, anon, authenticated;
grant execute on function public.update_payment_refund(uuid,public.refund_status,text,jsonb) to service_role;

create or replace function public.mark_order_delivered(p_order_id uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $
declare
  v_user_id uuid := (select auth.uid());
  v_order public.orders%rowtype;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;

  select * into v_order from public.orders where id = p_order_id and seller_id = v_user_id for update;
  if v_order.id is null then raise exception 'Order not found'; end if;
  if v_order.status <> 'shipped'::public.order_status then raise exception 'Only shipped orders can be delivered'; end if;

  update public.orders set status = 'delivered'::public.order_status, updated_at = now() where id = p_order_id;

  update public.commissions
  set status = case when refunded_amount >= gross_amount then 'reversed'::public.commission_status else 'eligible'::public.commission_status end,
      eligible_at = now(), updated_at = now()
  where order_id = p_order_id;

  insert into public.notifications(user_id, type, title, body, data)
  values(
    v_order.buyer_id, 'order.delivered', 'Order delivered',
    'Your order has been marked as delivered.',
    jsonb_build_object('order_id', p_order_id)
  );

  return jsonb_build_object('id', p_order_id, 'status', 'delivered');
end;
$$;

revoke execute on function public.mark_order_delivered(uuid) from public, anon;
grant execute on function public.mark_order_delivered(uuid) to authenticated;

create or replace function public.seller_update_order_status(
  p_order_id uuid,
  p_status public.order_status
)
returns jsonb
language plpgsql security definer set search_path = ''
as $
declare
  v_user_id uuid := (select auth.uid());
  v_order public.orders%rowtype;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;

  if p_status = 'delivered'::public.order_status then
    return public.mark_order_delivered(p_order_id);
  end if;

  select * into v_order from public.orders where id = p_order_id and seller_id = v_user_id for update;
  if v_order.id is null then raise exception 'Order not found'; end if;

  if not (
    (v_order.status = 'confirmed'::public.order_status and p_status = 'processing'::public.order_status)
    or (v_order.status = 'processing'::public.order_status and p_status = 'shipped'::public.order_status)
  ) then
    raise exception 'Invalid order status transition from % to %', v_order.status, p_status;
  end if;

  update public.orders set status = p_status, updated_at = now() where id = p_order_id;

  insert into public.notifications(user_id, type, title, body, data)
  values(
    v_order.buyer_id, 'order.status', 'Order status updated',
    'Your order status is now ' || replace(lower(p_status::text), '_', ' ') || '.',
    jsonb_build_object('order_id', p_order_id, 'status', p_status)
  );

  return jsonb_build_object('id', p_order_id, 'status', p_status);
end;
$$;

revoke execute on function public.seller_update_order_status(uuid,public.order_status) from public, anon;
grant execute on function public.seller_update_order_status(uuid,public.order_status) to authenticated;

create or replace function public.mark_commission_paid(p_commission_id uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_commission public.commissions%rowtype;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;

  select * into v_commission from public.commissions where id = p_commission_id for update;
  if v_commission.id is null then raise exception 'Commission not found'; end if;
  if v_commission.status <> 'eligible'::public.commission_status then
    raise exception 'Only eligible commissions can be marked paid';
  end if;

  update public.commissions
  set status = 'paid'::public.commission_status, paid_at = now(), updated_at = now()
  where id = p_commission_id;

  insert into public.notifications(user_id, type, title, body, data)
  values(
    v_commission.seller_id, 'commission.paid', 'Commission paid',
    'Your eligible commission has been marked as paid.',
    jsonb_build_object('commission_id', p_commission_id, 'amount', v_commission.seller_amount)
  );

  return jsonb_build_object('id', p_commission_id, 'status', 'paid');
end;
$$;

revoke execute on function public.mark_commission_paid(uuid) from public, anon, authenticated;
grant execute on function public.mark_commission_paid(uuid) to service_role;

create or replace function public.complete_checkout_payment(
  p_payment_id uuid,
  p_provider_data jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_payment public.payments%rowtype;
  v_session public.checkout_sessions%rowtype;
  v_allocation record;
  v_item record;
  v_affected integer;
begin
  select * into v_payment from public.payments where id = p_payment_id for update;
  if v_payment.id is null then raise exception 'Payment not found'; end if;
  if v_payment.checkout_session_id is null then raise exception 'Payment is not attached to a checkout session'; end if;

  select * into v_session from public.checkout_sessions where id = v_payment.checkout_session_id for update;
  if v_session.id is null then raise exception 'Checkout session not found'; end if;

  if v_payment.status = 'paid'::public.payment_status
     and v_session.status = 'paid'::public.checkout_session_status then
    return jsonb_build_object('checkout_session_id', v_session.id, 'status', 'paid');
  end if;

  if v_session.status <> 'pending'::public.checkout_session_status then
    raise exception 'Checkout session is not payable';
  end if;

  if v_payment.amount <> v_session.total or v_payment.currency <> v_session.currency then
    raise exception 'Payment amount or currency does not match checkout session';
  end if;

  update public.payments
  set status = 'paid'::public.payment_status,
      paid_at = coalesce((p_provider_data->>'paid_at')::timestamptz, now()),
      metadata = p_provider_data, updated_at = now()
  where id = v_payment.id;

  for v_allocation in
    select cso.order_id, cso.amount
    from public.checkout_session_orders cso
    where cso.checkout_session_id = v_session.id
    order by cso.order_id
  loop
    insert into public.payment_allocations(payment_id, order_id, amount)
    values(v_payment.id, v_allocation.order_id, v_allocation.amount)
    on conflict(payment_id, order_id) do update set amount = excluded.amount;

    update public.orders
    set status = 'confirmed'::public.order_status, updated_at = now()
    where id = v_allocation.order_id and status = 'pending'::public.order_status;

    perform public.create_order_commission(v_allocation.order_id);

    insert into public.notifications(user_id, type, title, body, data)
    select o.buyer_id, 'payment.success', 'Payment successful',
           'Your LOKA payment was confirmed.',
           jsonb_build_object('checkout_session_id', v_session.id, 'order_id', o.id, 'amount', o.total)
    from public.orders o where o.id = v_allocation.order_id;

    insert into public.notifications(user_id, type, title, body, data)
    select o.seller_id, 'order.confirmed', 'New paid order',
           'A new paid order is ready for processing.',
           jsonb_build_object('order_id', o.id, 'amount', o.total)
    from public.orders o where o.id = v_allocation.order_id;

    for v_item in
      select oi.product_id, oi.quantity
      from public.order_items oi
      where oi.order_id = v_allocation.order_id
    loop
      update public.inventory
      set quantity = quantity - v_item.quantity,
          reserved_quantity = reserved_quantity - v_item.quantity
      where product_id = v_item.product_id
        and reserved_quantity >= v_item.quantity;

      get diagnostics v_affected = row_count;
      if v_affected <> 1 then
        raise exception 'Inventory reservation missing for product %', v_item.product_id;
      end if;
    end loop;
  end loop;

  update public.checkout_sessions
  set status = 'paid'::public.checkout_session_status, updated_at = now()
  where id = v_session.id;

  insert into public.transactions(
    payment_id, order_id, user_id, type, amount, currency, reference, status, metadata
  )
  values(
    v_payment.id, null, v_session.buyer_id, 'payment',
    v_payment.amount, v_payment.currency, v_payment.provider_reference, 'success', p_provider_data
  )
  on conflict(reference) do update set status = 'success', metadata = excluded.metadata;

  return jsonb_build_object(
    'checkout_session_id', v_session.id,
    'status', 'paid',
    'total', v_session.total,
    'order_count', (select count(*) from public.checkout_session_orders where checkout_session_id = v_session.id)
  );
end;
$$;

revoke execute on function public.complete_checkout_payment(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.complete_checkout_payment(uuid,jsonb) to service_role;


-- Add buyer-facing notifications to failed and cancelled checkout flows.
create or replace function public.fail_checkout_payment(
  p_payment_id uuid,
  p_provider_data jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql security definer set search_path = ''
as $
declare
  v_payment public.payments%rowtype;
  v_session public.checkout_sessions%rowtype;
  v_item record;
begin
  select * into v_payment from public.payments where id = p_payment_id for update;
  if v_payment.id is null then raise exception 'Payment not found'; end if;
  if v_payment.checkout_session_id is null then raise exception 'Payment is not attached to a checkout session'; end if;
  select * into v_session from public.checkout_sessions where id = v_payment.checkout_session_id for update;
  if v_session.id is null then raise exception 'Checkout session not found'; end if;
  if v_payment.status = 'paid'::public.payment_status then raise exception 'Paid payment cannot be failed'; end if;
  if v_session.status = 'paid'::public.checkout_session_status then raise exception 'Paid checkout session cannot be failed'; end if;

  update public.payments set status = 'failed'::public.payment_status, metadata = p_provider_data, updated_at = now() where id = v_payment.id;
  update public.checkout_sessions set status = 'failed'::public.checkout_session_status, updated_at = now()
  where id = v_session.id and status = 'pending'::public.checkout_session_status;
  update public.orders set status = 'cancelled'::public.order_status, updated_at = now()
  where id in (select cso.order_id from public.checkout_session_orders cso where cso.checkout_session_id = v_session.id)
    and status = 'pending'::public.order_status;

  for v_item in
    select oi.product_id, oi.quantity
    from public.order_items oi
    join public.checkout_session_orders cso on cso.order_id = oi.order_id
    where cso.checkout_session_id = v_session.id
  loop
    update public.inventory set reserved_quantity = greatest(0, reserved_quantity - v_item.quantity)
    where product_id = v_item.product_id;
  end loop;

  insert into public.notifications(user_id, type, title, body, data)
  values(
    v_session.buyer_id, 'payment.failed', 'Payment failed',
    'Your LOKA payment was not completed. Your reserved items have been released.',
    jsonb_build_object('checkout_session_id', v_session.id, 'amount', v_session.total)
  );

  return jsonb_build_object('checkout_session_id', v_session.id, 'status', 'failed');
end;
$$;

revoke execute on function public.fail_checkout_payment(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.fail_checkout_payment(uuid,jsonb) to service_role;

create or replace function public.cancel_checkout_session(p_session_id uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $
declare
  v_user_id uuid := (select auth.uid());
  v_session public.checkout_sessions%rowtype;
  v_item record;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  select * into v_session from public.checkout_sessions
  where id = p_session_id and buyer_id = v_user_id for update;
  if v_session.id is null then raise exception 'Checkout session not found'; end if;
  if v_session.status <> 'pending'::public.checkout_session_status then raise exception 'Only pending checkout sessions can be cancelled'; end if;

  update public.checkout_sessions set status = 'cancelled'::public.checkout_session_status, updated_at = now()
  where id = p_session_id;
  update public.orders set status = 'cancelled'::public.order_status, updated_at = now()
  where id in (select cso.order_id from public.checkout_session_orders cso where cso.checkout_session_id = p_session_id)
    and status = 'pending'::public.order_status;

  for v_item in
    select oi.product_id, oi.quantity
    from public.order_items oi
    join public.checkout_session_orders cso on cso.order_id = oi.order_id
    where cso.checkout_session_id = p_session_id
  loop
    update public.inventory set reserved_quantity = greatest(0, reserved_quantity - v_item.quantity)
    where product_id = v_item.product_id;
  end loop;

  insert into public.notifications(user_id, type, title, body, data)
  values(
    v_session.buyer_id, 'checkout.cancelled', 'Checkout cancelled',
    'Your checkout was cancelled and reserved stock was released.',
    jsonb_build_object('checkout_session_id', p_session_id)
  );

  return jsonb_build_object('id', p_session_id, 'status', 'cancelled');
end;
$$;

revoke execute on function public.cancel_checkout_session(uuid) from public, anon;
grant execute on function public.cancel_checkout_session(uuid) to authenticated;
