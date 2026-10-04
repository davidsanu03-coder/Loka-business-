-- LOKA Phase 2.5: checkout sessions, single-payment marketplace checkout,
-- payment allocation, payment settlement, order lifecycle and stock release.

do $$
begin
  create type public.checkout_session_status as enum (
    'pending', 'paid', 'failed', 'cancelled', 'expired'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  address_id uuid references public.addresses(id) on delete set null,
  status public.checkout_session_status not null default 'pending',
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  shipping_fee numeric(14,2) not null default 0 check (shipping_fee >= 0),
  total numeric(14,2) not null default 0 check (total >= 0),
  currency text not null default 'NGN',
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.checkout_session_orders (
  checkout_session_id uuid not null references public.checkout_sessions(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  seller_id uuid not null references public.seller_profiles(user_id) on delete restrict,
  amount numeric(14,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  primary key (checkout_session_id, order_id),
  unique (order_id)
);

alter table public.payments
  alter column order_id drop not null;

alter table public.payments
  add column if not exists checkout_session_id uuid references public.checkout_sessions(id) on delete cascade;

do $$
begin
  alter table public.payments
    add constraint payments_single_owner_check
    check ((order_id is not null) <> (checkout_session_id is not null));
exception
  when duplicate_object then null;
end $$;

create table if not exists public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  amount numeric(14,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  unique (payment_id, order_id)
);

alter table public.checkout_sessions enable row level security;
alter table public.checkout_session_orders enable row level security;
alter table public.payment_allocations enable row level security;

grant select on public.checkout_sessions to authenticated;
grant select on public.checkout_session_orders to authenticated;
grant select on public.payment_allocations to authenticated;
grant all on public.checkout_sessions, public.checkout_session_orders, public.payment_allocations to service_role;

drop policy if exists payments_related_order on public.payments;
drop policy if exists payments_related_order_or_session on public.payments;
create policy payments_related_order_or_session on public.payments
for select to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.buyer_id = (select auth.uid()) or o.seller_id = (select auth.uid()) or public.is_admin())
  )
  or exists (
    select 1 from public.checkout_sessions cs
    where cs.id = checkout_session_id
      and (cs.buyer_id = (select auth.uid()) or public.is_admin())
  )
);

drop policy if exists checkout_sessions_buyer_admin on public.checkout_sessions;
create policy checkout_sessions_buyer_admin on public.checkout_sessions
for select to authenticated
using (buyer_id = (select auth.uid()) or public.is_admin());

drop policy if exists checkout_session_orders_participant_admin on public.checkout_session_orders;
create policy checkout_session_orders_participant_admin on public.checkout_session_orders
for select to authenticated
using (
  exists (
    select 1 from public.checkout_sessions cs
    where cs.id = checkout_session_id
      and (cs.buyer_id = (select auth.uid()) or public.is_admin())
  )
  or seller_id = (select auth.uid())
  or public.is_admin()
);

drop policy if exists payment_allocations_participant_admin on public.payment_allocations;
create policy payment_allocations_participant_admin on public.payment_allocations
for select to authenticated
using (
  exists (
    select 1 from public.payments p
    where p.id = payment_id
      and (
        exists (
          select 1 from public.orders o
          where o.id = p.order_id
            and (o.buyer_id = (select auth.uid()) or o.seller_id = (select auth.uid()))
        )
        or exists (
          select 1 from public.checkout_sessions cs
          where cs.id = p.checkout_session_id
            and cs.buyer_id = (select auth.uid())
        )
        or public.is_admin()
      )
  )
);

create index if not exists checkout_sessions_buyer_status_idx
  on public.checkout_sessions(buyer_id, status, created_at desc);
create index if not exists checkout_sessions_expiry_idx
  on public.checkout_sessions(status, expires_at);
create index if not exists checkout_session_orders_order_idx
  on public.checkout_session_orders(order_id);
create index if not exists checkout_session_orders_seller_idx
  on public.checkout_session_orders(seller_id, created_at desc);
create index if not exists payment_allocations_order_idx
  on public.payment_allocations(order_id, created_at desc);

create or replace function public.checkout_cart(
  p_address_id uuid,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_cart_id uuid;
  v_session_id uuid;
  v_seller_id uuid;
  v_order_id uuid;
  v_subtotal numeric(14,2);
  v_order_count integer := 0;
  v_total numeric(14,2) := 0;
  v_orders jsonb := '[]'::jsonb;
  v_item record;
  v_available integer;
  v_seller_status public.seller_status;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;

  select c.id into v_cart_id
  from public.carts c
  where c.user_id = v_user_id
  for update;

  if v_cart_id is null or not exists (
    select 1 from public.cart_items ci where ci.cart_id = v_cart_id
  ) then raise exception 'Cart is empty'; end if;

  if p_address_id is not null and not exists (
    select 1 from public.addresses a
    where a.id = p_address_id and a.user_id = v_user_id
  ) then raise exception 'Shipping address does not belong to this user'; end if;

  insert into public.checkout_sessions (
    buyer_id, address_id, status, subtotal, shipping_fee, total, currency, metadata
  )
  values (
    v_user_id, p_address_id, 'pending'::public.checkout_session_status,
    0, 0, 0, 'NGN', jsonb_build_object('notes', p_notes)
  )
  returning id into v_session_id;

  for v_seller_id in
    select distinct p.seller_id
    from public.cart_items ci
    join public.products p on p.id = ci.product_id
    where ci.cart_id = v_cart_id
    order by p.seller_id
  loop
    select sp.status into v_seller_status
    from public.seller_profiles sp
    where sp.user_id = v_seller_id;

    if v_seller_status is distinct from 'approved'::public.seller_status then
      raise exception 'Seller is not currently approved';
    end if;

    select coalesce(sum(p.price * ci.quantity), 0)::numeric(14,2)
    into v_subtotal
    from public.cart_items ci
    join public.products p on p.id = ci.product_id
    where ci.cart_id = v_cart_id and p.seller_id = v_seller_id;

    if v_subtotal <= 0 then raise exception 'Order subtotal must be greater than zero'; end if;

    insert into public.orders (
      buyer_id, seller_id, address_id, status, subtotal,
      shipping_fee, total, currency, notes
    )
    values (
      v_user_id, v_seller_id, p_address_id, 'pending'::public.order_status,
      v_subtotal, 0, v_subtotal, 'NGN', p_notes
    )
    returning id into v_order_id;

    for v_item in
      select ci.product_id, ci.quantity, p.name, p.price, p.currency,
             p.status, p.store_id, i.quantity as stock_quantity,
             i.reserved_quantity
      from public.cart_items ci
      join public.products p on p.id = ci.product_id
      join public.inventory i on i.product_id = p.id
      where ci.cart_id = v_cart_id and p.seller_id = v_seller_id
      order by ci.created_at
      for update of p, i
    loop
      if v_item.status <> 'active'::public.product_status then
        raise exception 'Product "%" is not available for purchase', v_item.name;
      end if;
      if v_item.currency <> 'NGN' then
        raise exception 'Only NGN checkout is currently supported';
      end if;
      if v_item.store_id is not null and not exists (
        select 1 from public.stores s
        where s.id = v_item.store_id
          and s.seller_id = v_seller_id
          and s.is_active = true
      ) then raise exception 'Product store is not active'; end if;

      v_available := v_item.stock_quantity - v_item.reserved_quantity;
      if v_available < v_item.quantity then
        raise exception 'Insufficient stock for product "%"', v_item.name;
      end if;

      update public.inventory
      set reserved_quantity = reserved_quantity + v_item.quantity
      where product_id = v_item.product_id;

      insert into public.order_items (
        order_id, product_id, product_name, unit_price, quantity, line_total
      )
      values (
        v_order_id, v_item.product_id, v_item.name, v_item.price,
        v_item.quantity, (v_item.price * v_item.quantity)::numeric(14,2)
      );
    end loop;

    insert into public.checkout_session_orders (
      checkout_session_id, order_id, seller_id, amount
    )
    values (v_session_id, v_order_id, v_seller_id, v_subtotal);

    v_order_count := v_order_count + 1;
    v_total := v_total + v_subtotal;
    v_orders := v_orders || jsonb_build_array(
      jsonb_build_object(
        'id', v_order_id, 'seller_id', v_seller_id,
        'subtotal', v_subtotal, 'shipping_fee', 0,
        'total', v_subtotal, 'currency', 'NGN'
      )
    );
  end loop;

  update public.checkout_sessions
  set subtotal = v_total, shipping_fee = 0, total = v_total,
      metadata = jsonb_build_object('notes', p_notes, 'order_count', v_order_count),
      updated_at = now()
  where id = v_session_id;

  delete from public.cart_items where cart_id = v_cart_id;
  update public.carts set updated_at = now() where id = v_cart_id;

  return jsonb_build_object(
    'checkout_session_id', v_session_id,
    'orders', v_orders,
    'order_count', v_order_count,
    'subtotal', v_total,
    'shipping_fee', 0,
    'total', v_total,
    'currency', 'NGN',
    'expires_at', (select cs.expires_at from public.checkout_sessions cs where cs.id = v_session_id)
  );
end;
$$;

revoke execute on function public.checkout_cart(uuid, text) from public, anon;
grant execute on function public.checkout_cart(uuid, text) to authenticated;

create or replace function public.cancel_checkout_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_session public.checkout_sessions%rowtype;
  v_item record;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;

  select * into v_session
  from public.checkout_sessions
  where id = p_session_id and buyer_id = v_user_id
  for update;

  if v_session.id is null then raise exception 'Checkout session not found'; end if;
  if v_session.status <> 'pending'::public.checkout_session_status then
    raise exception 'Only pending checkout sessions can be cancelled';
  end if;

  update public.checkout_sessions
  set status = 'cancelled'::public.checkout_session_status, updated_at = now()
  where id = p_session_id;

  update public.orders
  set status = 'cancelled'::public.order_status, updated_at = now()
  where id in (
    select cso.order_id from public.checkout_session_orders cso
    where cso.checkout_session_id = p_session_id
  )
  and status = 'pending'::public.order_status;

  for v_item in
    select oi.product_id, oi.quantity
    from public.order_items oi
    join public.checkout_session_orders cso on cso.order_id = oi.order_id
    where cso.checkout_session_id = p_session_id
  loop
    update public.inventory
    set reserved_quantity = greatest(0, reserved_quantity - v_item.quantity)
    where product_id = v_item.product_id;
  end loop;

  return jsonb_build_object('id', p_session_id, 'status', 'cancelled');
end;
$$;

revoke execute on function public.cancel_checkout_session(uuid) from public, anon;
grant execute on function public.cancel_checkout_session(uuid) to authenticated;

create or replace function public.expire_checkout_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_session public.checkout_sessions%rowtype;
  v_item record;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;

  select * into v_session
  from public.checkout_sessions
  where id = p_session_id and buyer_id = v_user_id
  for update;

  if v_session.id is null then raise exception 'Checkout session not found'; end if;
  if v_session.status <> 'pending'::public.checkout_session_status then
    return jsonb_build_object('id', v_session.id, 'status', v_session.status);
  end if;
  if v_session.expires_at > now() then
    return jsonb_build_object('id', v_session.id, 'status', 'pending');
  end if;

  update public.checkout_sessions
  set status = 'expired'::public.checkout_session_status, updated_at = now()
  where id = v_session.id;

  update public.orders
  set status = 'cancelled'::public.order_status, updated_at = now()
  where id in (
    select cso.order_id from public.checkout_session_orders cso
    where cso.checkout_session_id = v_session.id
  )
  and status = 'pending'::public.order_status;

  for v_item in
    select oi.product_id, oi.quantity
    from public.order_items oi
    join public.checkout_session_orders cso on cso.order_id = oi.order_id
    where cso.checkout_session_id = v_session.id
  loop
    update public.inventory
    set reserved_quantity = greatest(0, reserved_quantity - v_item.quantity)
    where product_id = v_item.product_id;
  end loop;

  return jsonb_build_object('id', v_session.id, 'status', 'expired');
end;
$$;

revoke execute on function public.expire_checkout_session(uuid) from public, anon;
grant execute on function public.expire_checkout_session(uuid) to authenticated;

create or replace function public.complete_checkout_payment(
  p_payment_id uuid,
  p_provider_data jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payments%rowtype;
  v_session public.checkout_sessions%rowtype;
  v_item record;
  v_allocation record;
  v_reference text;
  v_affected integer;
begin
  select * into v_payment from public.payments where id = p_payment_id for update;
  if v_payment.id is null then raise exception 'Payment not found'; end if;
  if v_payment.checkout_session_id is null then
    raise exception 'Payment is not attached to a checkout session';
  end if;

  select * into v_session
  from public.checkout_sessions
  where id = v_payment.checkout_session_id
  for update;

  if v_session.id is null then raise exception 'Checkout session not found'; end if;

  if v_payment.status = 'paid'::public.payment_status
     and v_session.status = 'paid'::public.checkout_session_status then
    return jsonb_build_object(
      'checkout_session_id', v_session.id,
      'status', 'paid',
      'order_count', (select count(*) from public.checkout_session_orders where checkout_session_id = v_session.id)
    );
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
    values (v_payment.id, v_allocation.order_id, v_allocation.amount)
    on conflict (payment_id, order_id) do update set amount = excluded.amount;

    update public.orders
    set status = 'confirmed'::public.order_status, updated_at = now()
    where id = v_allocation.order_id and status = 'pending'::public.order_status;

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

  v_reference := coalesce(v_payment.provider_reference, 'payment-' || v_payment.id::text);

  insert into public.transactions (
    payment_id, order_id, user_id, type, amount, currency, reference, status, metadata
  )
  values (
    v_payment.id, null, v_session.buyer_id, 'payment',
    v_payment.amount, v_payment.currency, v_reference, 'success', p_provider_data
  )
  on conflict (reference) do update
    set status = 'success', metadata = excluded.metadata;

  return jsonb_build_object(
    'checkout_session_id', v_session.id,
    'status', 'paid',
    'total', v_session.total,
    'order_count', (select count(*) from public.checkout_session_orders where checkout_session_id = v_session.id)
  );
end;
$$;

revoke execute on function public.complete_checkout_payment(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.complete_checkout_payment(uuid, jsonb) to service_role;

create or replace function public.fail_checkout_payment(
  p_payment_id uuid,
  p_provider_data jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payments%rowtype;
  v_session public.checkout_sessions%rowtype;
  v_item record;
begin
  select * into v_payment from public.payments where id = p_payment_id for update;
  if v_payment.id is null then raise exception 'Payment not found'; end if;
  if v_payment.checkout_session_id is null then
    raise exception 'Payment is not attached to a checkout session';
  end if;

  select * into v_session
  from public.checkout_sessions
  where id = v_payment.checkout_session_id
  for update;

  if v_payment.status = 'paid'::public.payment_status then
    raise exception 'Paid payment cannot be failed';
  end if;
  if v_session.status = 'paid'::public.checkout_session_status then
    raise exception 'Paid checkout session cannot be failed';
  end if;

  update public.payments
  set status = 'failed'::public.payment_status,
      metadata = p_provider_data, updated_at = now()
  where id = v_payment.id;

  update public.checkout_sessions
  set status = 'failed'::public.checkout_session_status, updated_at = now()
  where id = v_session.id and status = 'pending'::public.checkout_session_status;

  update public.orders
  set status = 'cancelled'::public.order_status, updated_at = now()
  where id in (
    select cso.order_id from public.checkout_session_orders cso
    where cso.checkout_session_id = v_session.id
  )
  and status = 'pending'::public.order_status;

  for v_item in
    select oi.product_id, oi.quantity
    from public.order_items oi
    join public.checkout_session_orders cso on cso.order_id = oi.order_id
    where cso.checkout_session_id = v_session.id
  loop
    update public.inventory
    set reserved_quantity = greatest(0, reserved_quantity - v_item.quantity)
    where product_id = v_item.product_id;
  end loop;

  return jsonb_build_object('checkout_session_id', v_session.id, 'status', 'failed');
end;
$$;

revoke execute on function public.fail_checkout_payment(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.fail_checkout_payment(uuid, jsonb) to service_role;

create or replace function public.expire_checkout_sessions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session record;
  v_item record;
  v_count integer := 0;
begin
  for v_session in
    select * from public.checkout_sessions
    where status = 'pending'::public.checkout_session_status
      and expires_at <= now()
    for update skip locked
  loop
    update public.checkout_sessions
    set status = 'expired'::public.checkout_session_status, updated_at = now()
    where id = v_session.id;

    update public.orders
    set status = 'cancelled'::public.order_status, updated_at = now()
    where id in (
      select cso.order_id from public.checkout_session_orders cso
      where cso.checkout_session_id = v_session.id
    )
    and status = 'pending'::public.order_status;

    for v_item in
      select oi.product_id, oi.quantity
      from public.order_items oi
      join public.checkout_session_orders cso on cso.order_id = oi.order_id
      where cso.checkout_session_id = v_session.id
    loop
      update public.inventory
      set reserved_quantity = greatest(0, reserved_quantity - v_item.quantity)
      where product_id = v_item.product_id;
    end loop;

    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke execute on function public.expire_checkout_sessions() from public, anon, authenticated;
grant execute on function public.expire_checkout_sessions() to service_role;

create or replace function public.seller_update_order_status(
  p_order_id uuid,
  p_status public.order_status
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_order public.orders%rowtype;
  v_item record;
  v_allowed boolean := false;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;

  select * into v_order
  from public.orders
  where id = p_order_id and seller_id = v_user_id
  for update;

  if v_order.id is null then raise exception 'Order not found'; end if;

  v_allowed := (
    (v_order.status = 'pending'::public.order_status and p_status in ('processing'::public.order_status, 'cancelled'::public.order_status))
    or (v_order.status = 'confirmed'::public.order_status and p_status = 'processing'::public.order_status)
    or (v_order.status = 'processing'::public.order_status and p_status = 'shipped'::public.order_status)
    or (v_order.status = 'shipped'::public.order_status and p_status = 'delivered'::public.order_status)
  );

  if not v_allowed then
    raise exception 'Invalid order status transition from % to %', v_order.status, p_status;
  end if;

  if p_status = 'cancelled'::public.order_status then
    update public.orders set status = p_status, updated_at = now() where id = p_order_id;

    for v_item in
      select product_id, quantity from public.order_items where order_id = p_order_id
    loop
      update public.inventory
      set reserved_quantity = greatest(0, reserved_quantity - v_item.quantity)
      where product_id = v_item.product_id;
    end loop;
  else
    update public.orders set status = p_status, updated_at = now() where id = p_order_id;
  end if;

  return jsonb_build_object('id', p_order_id, 'status', p_status);
end;
$$;

revoke execute on function public.seller_update_order_status(uuid, public.order_status) from public, anon;
grant execute on function public.seller_update_order_status(uuid, public.order_status) to authenticated;
