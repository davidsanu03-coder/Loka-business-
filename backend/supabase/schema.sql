-- LOKA marketplace core schema
-- Apply to a dedicated LOKA Supabase project.
-- RLS is enabled on every exposed table.

create extension if not exists pgcrypto;

create type public.account_role as enum ('user', 'seller', 'admin');
create type public.seller_status as enum ('pending', 'approved', 'suspended', 'rejected');
create type public.product_status as enum ('draft', 'active', 'archived');
create type public.order_status as enum ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded', 'partially_refunded');
create type public.checkout_session_status as enum ('pending', 'paid', 'failed', 'cancelled', 'expired');
create type public.dispute_status as enum ('open', 'under_review', 'resolved', 'rejected');
create type public.commission_status as enum ('pending','eligible','paid','reversed','partially_reversed');
create type public.refund_status as enum ('pending','processing','needs_attention','processed','failed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.account_role not null default 'user',
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.seller_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  store_name text not null,
  slug text not null unique,
  description text,
  status public.seller_status not null default 'pending',
  commission_rate numeric(5,2) not null default 10.00 check (commission_rate >= 0 and commission_rate <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.seller_profiles(user_id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text,
  logo_url text,
  banner_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  parent_id uuid references public.categories(id) on delete set null,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.seller_profiles(user_id) on delete cascade,
  store_id uuid references public.stores(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  price numeric(14,2) not null check (price >= 0),
  compare_at_price numeric(14,2) check (compare_at_price is null or compare_at_price >= 0),
  currency text not null default 'NGN',
  status public.product_status not null default 'draft',
  sku text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index products_seller_sku_idx on public.products(seller_id, sku) where sku is not null;
create index products_category_idx on public.products(category_id);
create index products_seller_idx on public.products(seller_id);
create index products_status_idx on public.products(status);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.inventory (
  product_id uuid primary key references public.products(id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  reserved_quantity integer not null default 0 check (reserved_quantity >= 0 and reserved_quantity <= quantity),
  updated_at timestamptz not null default now()
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text,
  recipient_name text not null,
  phone text not null,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text not null,
  country text not null default 'Nigeria',
  postal_code text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  unique(cart_id, product_id)
);

create table public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, product_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  seller_id uuid not null references public.seller_profiles(user_id) on delete restrict,
  address_id uuid references public.addresses(id) on delete set null,
  status public.order_status not null default 'pending',
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  shipping_fee numeric(14,2) not null default 0 check (shipping_fee >= 0),
  total numeric(14,2) not null default 0 check (total >= 0),
  currency text not null default 'NGN',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_buyer_idx on public.orders(buyer_id, created_at desc);
create index orders_seller_idx on public.orders(seller_id, created_at desc);

create table public.checkout_sessions (
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

create table public.checkout_session_orders (
  checkout_session_id uuid not null references public.checkout_sessions(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  seller_id uuid not null references public.seller_profiles(user_id) on delete restrict,
  amount numeric(14,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  primary key (checkout_session_id, order_id),
  unique (order_id)
);

create index checkout_sessions_buyer_status_idx
  on public.checkout_sessions(buyer_id, status, created_at desc);
create index checkout_sessions_address_idx on public.checkout_sessions(address_id);
create index checkout_sessions_expiry_idx
  on public.checkout_sessions(status, expires_at);
create index checkout_session_orders_order_idx
  on public.checkout_session_orders(order_id);
create index checkout_session_orders_seller_idx
  on public.checkout_session_orders(seller_id, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name text not null,
  unit_price numeric(14,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(14,2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  provider text not null,
  provider_reference text unique,
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null default 'NGN',
  status public.payment_status not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payments
  add column checkout_session_id uuid references public.checkout_sessions(id) on delete cascade;

alter table public.payments
  add constraint payments_single_owner_check
  check ((order_id is not null) <> (checkout_session_id is not null));

create table public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  amount numeric(14,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  unique (payment_id, order_id)
);

create index payment_allocations_order_idx
  on public.payment_allocations(order_id, created_at desc);
create index payments_checkout_session_idx on public.payments(checkout_session_id);
create unique index payments_pending_session_unique
  on public.payments(checkout_session_id)
  where checkout_session_id is not null and status = 'pending';

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references public.payments(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  type text not null,
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null default 'NGN',
  reference text unique,
  status text not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  title text,
  body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, buyer_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.commissions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  seller_id uuid not null references public.seller_profiles(user_id) on delete restrict,
  gross_amount numeric(14,2) not null check (gross_amount >= 0),
  commission_rate numeric(5,2) not null check (commission_rate >= 0 and commission_rate <= 100),
  commission_amount numeric(14,2) not null check (commission_amount >= 0),
  seller_amount numeric(14,2) not null check (seller_amount >= 0),
  status public.commission_status not null default 'pending',
  refunded_amount numeric(14,2) not null default 0 check (refunded_amount >= 0),
  eligible_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index commissions_order_unique on public.commissions(order_id);
create index commissions_seller_status_idx on public.commissions(seller_id, status, created_at desc);

create table public.payment_refunds (
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

create index payment_refunds_payment_idx on public.payment_refunds(payment_id, created_at desc);
create index payment_refunds_order_idx on public.payment_refunds(order_id, created_at desc);

create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  opened_by uuid not null references public.profiles(id) on delete restrict,
  reason text not null,
  description text,
  status public.dispute_status not null default 'open',
  resolution text,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Keep updated_at fields consistent.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles','seller_profiles','stores','products','inventory','addresses',
    'carts','orders','payments','reviews','notifications','disputes'
  ] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute procedure public.set_updated_at()', t);
  end loop;
end $$;

-- RLS: every exposed table is protected.
alter table public.profiles enable row level security;
alter table public.seller_profiles enable row level security;
alter table public.stores enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.inventory enable row level security;
alter table public.addresses enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.wishlists enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.transactions enable row level security;
alter table public.reviews enable row level security;
alter table public.notifications enable row level security;
alter table public.payment_refunds enable row level security;
alter table public.checkout_sessions enable row level security;
alter table public.checkout_session_orders enable row level security;
alter table public.payment_allocations enable row level security;
alter table public.commissions enable row level security;
alter table public.disputes enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce((select (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'), false);
$$;

create policy profiles_self_or_admin on public.profiles
for all to authenticated
using (id = (select auth.uid()) or public.is_admin())
with check (id = (select auth.uid()) or public.is_admin());

create policy seller_profiles_public_read on public.seller_profiles
for select to anon, authenticated using (status = 'approved' or user_id = (select auth.uid()) or public.is_admin());

create policy seller_profiles_manage on public.seller_profiles
for all to authenticated
using (user_id = (select auth.uid()) or public.is_admin())
with check (user_id = (select auth.uid()) or public.is_admin());

create policy stores_public_read on public.stores
for select to anon, authenticated using (is_active = true or seller_id = (select auth.uid()) or public.is_admin());

create policy stores_manage on public.stores
for all to authenticated
using (seller_id = (select auth.uid()) or public.is_admin())
with check (seller_id = (select auth.uid()) or public.is_admin());

create policy categories_public_read on public.categories
for select to anon, authenticated using (is_active = true or public.is_admin());

create policy categories_admin_write on public.categories
for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy products_public_read on public.products
for select to anon, authenticated using (status = 'active' or seller_id = (select auth.uid()) or public.is_admin());

create policy products_seller_write on public.products
for all to authenticated
using (seller_id = (select auth.uid()) or public.is_admin())
with check (seller_id = (select auth.uid()) or public.is_admin());

create policy product_images_public_read on public.product_images
for select to anon, authenticated using (
  exists (select 1 from public.products p where p.id = product_id and (p.status = 'active' or p.seller_id = (select auth.uid()) or public.is_admin()))
);

create policy product_images_seller_write on public.product_images
for all to authenticated
using (
  exists (select 1 from public.products p where p.id = product_id and (p.seller_id = (select auth.uid()) or public.is_admin()))
)
with check (
  exists (select 1 from public.products p where p.id = product_id and (p.seller_id = (select auth.uid()) or public.is_admin()))
);

create policy inventory_seller_write on public.inventory
for all to authenticated
using (
  exists (select 1 from public.products p where p.id = product_id and (p.seller_id = (select auth.uid()) or public.is_admin()))
)
with check (
  exists (select 1 from public.products p where p.id = product_id and (p.seller_id = (select auth.uid()) or public.is_admin()))
);

create policy addresses_owner on public.addresses
for all to authenticated
using (user_id = (select auth.uid()) or public.is_admin())
with check (user_id = (select auth.uid()) or public.is_admin());

create policy carts_owner on public.carts
for all to authenticated
using (user_id = (select auth.uid()) or public.is_admin())
with check (user_id = (select auth.uid()) or public.is_admin());

create policy cart_items_owner on public.cart_items
for all to authenticated
using (
  exists (select 1 from public.carts c where c.id = cart_id and (c.user_id = (select auth.uid()) or public.is_admin()))
)
with check (
  exists (select 1 from public.carts c where c.id = cart_id and (c.user_id = (select auth.uid()) or public.is_admin()))
);

create policy wishlist_owner on public.wishlists
for all to authenticated
using (user_id = (select auth.uid()) or public.is_admin())
with check (user_id = (select auth.uid()) or public.is_admin());

create policy orders_buyer_seller_admin on public.orders
for select to authenticated
using (buyer_id = (select auth.uid()) or seller_id = (select auth.uid()) or public.is_admin());

create policy orders_buyer_create on public.orders
for insert to authenticated
with check (buyer_id = (select auth.uid()));

create policy orders_seller_admin_update on public.orders
for update to authenticated
using (seller_id = (select auth.uid()) or public.is_admin())
with check (seller_id = (select auth.uid()) or public.is_admin());

create policy order_items_related_order on public.order_items
for select to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_id and (o.buyer_id = (select auth.uid()) or o.seller_id = (select auth.uid()) or public.is_admin())
  )
);

create policy order_items_buyer_insert on public.order_items
for insert to authenticated
with check (
  exists (select 1 from public.orders o where o.id = order_id and o.buyer_id = (select auth.uid()))
);

create policy payments_related_order_or_session on public.payments
for select to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_id and (o.buyer_id = (select auth.uid()) or o.seller_id = (select auth.uid()) or public.is_admin())
  )
  or exists (
    select 1 from public.checkout_sessions cs
    where cs.id = checkout_session_id and (cs.buyer_id = (select auth.uid()) or public.is_admin())
  )
);

create policy checkout_sessions_buyer_admin on public.checkout_sessions
for select to authenticated
using (buyer_id = (select auth.uid()) or public.is_admin());

create policy checkout_session_orders_participant_admin on public.checkout_session_orders
for select to authenticated
using (
  exists (
    select 1 from public.checkout_sessions cs
    where cs.id = checkout_session_id and (cs.buyer_id = (select auth.uid()) or public.is_admin())
  )
  or seller_id = (select auth.uid())
  or public.is_admin()
);

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
          where cs.id = p.checkout_session_id and cs.buyer_id = (select auth.uid())
        )
        or public.is_admin()
      )
  )
);

create policy transactions_owner_admin on public.transactions
for select to authenticated
using (user_id = (select auth.uid()) or public.is_admin());

create policy reviews_public_read on public.reviews
for select to anon, authenticated using (true);

create policy reviews_buyer_write on public.reviews
for all to authenticated
using (buyer_id = (select auth.uid()) or public.is_admin())
with check (buyer_id = (select auth.uid()) or public.is_admin());

create policy notifications_owner_admin on public.notifications
for all to authenticated
using (user_id = (select auth.uid()) or public.is_admin())
with check (user_id = (select auth.uid()) or public.is_admin());

create policy commissions_seller_admin on public.commissions
for select to authenticated
using (seller_id = (select auth.uid()) or public.is_admin());

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

create policy disputes_participant_admin on public.disputes
for all to authenticated
using (
  opened_by = (select auth.uid())
  or exists (select 1 from public.orders o where o.id = order_id and (o.buyer_id = (select auth.uid()) or o.seller_id = (select auth.uid())))
  or public.is_admin()
)
with check (
  opened_by = (select auth.uid()) or public.is_admin()
);

-- Public product discovery indexes.
create index product_images_product_idx on public.product_images(product_id, sort_order);
create index reviews_product_idx on public.reviews(product_id, created_at desc);
create index notifications_user_idx on public.notifications(user_id, created_at desc);
create index disputes_order_idx on public.disputes(order_id, created_at desc);

grant select on public.checkout_sessions to authenticated;
grant select on public.checkout_session_orders to authenticated;
grant select on public.payment_allocations, public.payment_refunds to authenticated;
grant all on public.checkout_sessions, public.checkout_session_orders, public.payment_allocations, public.payment_refunds to service_role;

 
-- Checkout, settlement, refunds and commission functions are maintained in
-- the Phase 2 and Phase 2.5 migration files.
-- Keep migration files as the deployable source of truth.
