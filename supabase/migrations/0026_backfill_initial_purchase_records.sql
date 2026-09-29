-- 0026_backfill_initial_purchase_records.sql
-- Backfill purchase_records for existing active products with initial stock or positive stock
-- where no purchase_records exists, ensuring Inventory History accurately reflects stock procurement.

insert into public.purchase_records (
  id,
  operation_id,
  type,
  product_id,
  product_name,
  sku,
  quantity,
  cost_price,
  retail_price,
  total_amount,
  supplier,
  supplier_id,
  added_by,
  notes,
  purchased_at,
  created_at,
  updated_at
)
select
  gen_random_uuid(),
  gen_random_uuid(),
  'Stock IN',
  p.id,
  p.name,
  p.sku,
  p.stock,
  coalesce(p.cost_price, 0),
  coalesce(p.retail_price, 0),
  p.stock * coalesce(p.cost_price, 0),
  coalesce(s.name, 'Initial Stock'),
  p.supplier_id,
  'Initial Entry',
  'Initial Stock Balance',
  p.created_at,
  p.created_at,
  p.created_at
from public.products p
left join public.suppliers s on p.supplier_id = s.id
where p.active = 1
  and p.track_inventory = 1
  and p.stock > 0
  and p.stock < 990000
  and not exists (
    select 1 from public.purchase_records pr
    where pr.product_id = p.id
      and pr.deleted_at is null
  );
