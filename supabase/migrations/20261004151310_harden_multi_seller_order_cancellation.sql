-- Prevent partial cancellation of orders that belong to an unpaid multi-seller checkout session.
create or replace function public.cancel_buyer_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_order public.orders%rowtype;
  v_session_status public.checkout_session_status;
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

  select cs.status into v_session_status
  from public.checkout_session_orders cso
  join public.checkout_sessions cs on cs.id = cso.checkout_session_id
  where cso.order_id = p_order_id
  for update of cs;

  if v_session_status = 'pending'::public.checkout_session_status then
    raise exception 'This order belongs to a pending checkout session; cancel the checkout session instead';
  end if;

  if v_order.status <> 'pending'::public.order_status then
    raise exception 'Only pending orders can be cancelled';
  end if;

  update public.orders
  set status = 'cancelled'::public.order_status, updated_at = now()
  where id = p_order_id;

  for v_item in
    select product_id, quantity
    from public.order_items
    where order_id = p_order_id
  loop
    update public.inventory
    set reserved_quantity = greatest(0, reserved_quantity - v_item.quantity)
    where product_id = v_item.product_id;
  end loop;

  return jsonb_build_object('id', p_order_id, 'status', 'cancelled');
end;
$$;

revoke execute on function public.cancel_buyer_order(uuid) from public, anon;
grant execute on function public.cancel_buyer_order(uuid) to authenticated;
