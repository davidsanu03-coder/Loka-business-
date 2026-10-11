-- LOKA Phase 2: cart checkout and atomic inventory reservation.

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
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select c.id into v_cart_id
  from public.carts c
  where c.user_id = v_user_id
  for update;

  if v_cart_id is null or not exists (
    select 1 from public.cart_items ci where ci.cart_id = v_cart_id
  ) then
    raise exception 'Cart is empty';
  end if;

  if p_address_id is not null and not exists (
    select 1 from public.addresses a
    where a.id = p_address_id and a.user_id = v_user_id
  ) then
    raise exception 'Shipping address does not belong to this user';
  end if;

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

    if v_subtotal <= 0 then
      raise exception 'Order subtotal must be greater than zero';
    end if;

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
      select
        ci.product_id, ci.quantity, p.name, p.price, p.currency,
        p.status, p.store_id, i.quantity as stock_quantity,
        i.reserved_quantity
      from public.cart_items ci
      join public.products p on p.id = ci.product_id
      left join public.inventory i on i.product_id = p.id
      where ci.cart_id = v_cart_id and p.seller_id = v_seller_id
      order by ci.created_at
      for update of p
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
      ) then
        raise exception 'Product store is not active';
      end if;

      if v_item.stock_quantity is null then
        raise exception 'Inventory is not configured for product "%"', v_item.name;
      end if;

      v_available := v_item.stock_quantity - v_item.reserved_quantity;
      if v_available < v_item.quantity then
        raise exception 'Insufficient stock for product "%"', v_item.name;
      end if;

      update public.inventory
      set reserved_quantity = reserved_quantity + v_item.quantity,
          quantity = quantity - v_item.quantity
      where product_id = v_item.product_id;

      insert into public.order_items (
        order_id, product_id, product_name, unit_price, quantity, line_total
      )
      values (
        v_order_id, v_item.product_id, v_item.name, v_item.price,
        v_item.quantity, (v_item.price * v_item.quantity)::numeric(14,2)
      );
    end loop;

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

  delete from public.cart_items where cart_id = v_cart_id;

  update public.carts set updated_at = now() where id = v_cart_id;

  return jsonb_build_object(
    'orders', v_orders,
    'order_count', v_order_count,
    'subtotal', v_total,
    'shipping_fee', 0,
    'total', v_total,
    'currency', 'NGN'
  );
end;
$$;

revoke execute on function public.checkout_cart(uuid, text) from public, anon;
grant execute on function public.checkout_cart(uuid, text) to authenticated;

create or replace function public.cancel_buyer_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_order public.orders%rowtype;
  v_item record;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id and buyer_id = v_user_id
  for update;

  if v_order.id is null then
    raise exception 'Order not found';
  end if;

  if v_order.status <> 'pending'::public.order_status then
    raise exception 'Only pending orders can be cancelled';
  end if;

  update public.orders
  set status = 'cancelled'::public.order_status
  where id = p_order_id;

  for v_item in
    select product_id, quantity
    from public.order_items
    where order_id = p_order_id
  loop
    update public.inventory
    set quantity = quantity + v_item.quantity,
        reserved_quantity = greatest(0, reserved_quantity - v_item.quantity)
    where product_id = v_item.product_id;
  end loop;

  return jsonb_build_object('id', p_order_id, 'status', 'cancelled');
end;
$$;

revoke execute on function public.cancel_buyer_order(uuid) from public, anon;
grant execute on function public.cancel_buyer_order(uuid) to authenticated;

create index if not exists cart_items_cart_created_idx
  on public.cart_items(cart_id, created_at);

create index if not exists payments_order_status_idx
  on public.payments(order_id, status);

create index if not exists transactions_order_created_idx
  on public.transactions(order_id, created_at desc);
