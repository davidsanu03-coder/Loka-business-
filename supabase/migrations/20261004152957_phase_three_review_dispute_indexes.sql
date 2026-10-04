create index if not exists reviews_buyer_idx on public.reviews(buyer_id, created_at desc);
create index if not exists reviews_order_item_idx on public.reviews(order_item_id);
create index if not exists disputes_opened_by_status_idx on public.disputes(opened_by, status, created_at desc);
create index if not exists disputes_status_idx on public.disputes(status, created_at desc);
