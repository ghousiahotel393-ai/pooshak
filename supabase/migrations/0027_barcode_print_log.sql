-- 0027_barcode_print_log.sql
-- ============================================================================
-- BARCODE PRINT TRACKING → cloud-direct, append-only ledger (AGENTS.md §1.7.5, §2.3)
-- ============================================================================
-- Print tracking used to live in browser localStorage, so it was per-device, never
-- synced, and could double-count on a re-render. This replaces it with an append-only
-- ledger table: each confirmed print run appends one row per product via a single
-- atomic bundle. total_printed(product) = SUM(quantity); unprinted = received - printed.
-- Idempotent on the row operation_id, so a bundle replay never adds duplicate rows.
-- ============================================================================

create table if not exists public.barcode_print_log (
  id           uuid primary key,
  operation_id uuid not null unique,
  product_id   uuid not null,
  variant_id   text,
  quantity     numeric not null default 0,
  printed_by   text,
  device_id    text,
  note         text,
  created_at   timestamptz not null default now()
);

create index if not exists idx_barcode_print_log_product on public.barcode_print_log(product_id);

alter table public.barcode_print_log enable row level security;
drop policy if exists barcode_print_log_all on public.barcode_print_log;
create policy barcode_print_log_all on public.barcode_print_log
  for all to anon, authenticated using (true) with check (true);

-- ----------------------------------------------------------------------------
-- Extend apply_bundle: classify barcode_print_log as append-only so its inserts
-- take the `on conflict (operation_id) do nothing` branch (idempotent, insert-only).
-- Copied verbatim from 0025 with the one array entry added.
-- ----------------------------------------------------------------------------
create or replace function public.apply_bundle(
  p_operation_id text,
  p_action       text,
  p_rows         jsonb
) returns jsonb
language plpgsql
as $$
declare
  v_denied text[] := array['bundle_operations','repair_quarantine','_migrations','sync_pull_cursor','sync_queue','sequence_registry'];
  v_append_only text[] := array[
    'inventory_ledger','sale_items','sale_voids','sale_refunds',
    'payments','customer_ledger','audit_logs',
    'stock_history','variant_stock_history','price_history','sale_audit_log',
    'barcode_print_log'
  ];
  v_existing jsonb; v_found boolean; v_row jsonb; v_table text; v_op text; v_payload jsonb;
  v_cols text; v_set text; v_count integer := 0; v_result jsonb;
  v_seq_col text; v_val text; v_num_txt text; v_prefix text; v_width int;
  v_maxnum bigint; v_newnum bigint; v_newval text; v_try int;
  v_renumbered jsonb := '[]'::jsonb;
begin
  select true, result into v_found, v_existing from public.bundle_operations where operation_id = p_operation_id;
  if v_found then return coalesce(v_existing, jsonb_build_object('replayed', true)); end if;

  for v_row in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    v_table := v_row->>'table'; v_op := v_row->>'op'; v_payload := v_row->'payload';

    if v_table is null or v_table = any(v_denied) or to_regclass('public.' || v_table) is null then
      raise exception 'apply_bundle: table % not allowed', v_table;
    end if;
    if v_payload is null then raise exception 'apply_bundle: null payload for table %', v_table; end if;

    if v_op = 'delete' then
      execute format('delete from public.%I where id::text = $1', v_table) using (v_payload->>'id');
    else
      select string_agg(format('%I', k), ', ') into v_cols from jsonb_object_keys(v_payload) k;
      if v_cols is null then raise exception 'apply_bundle: empty payload for table %', v_table; end if;

      if v_table = any(v_append_only) then
        execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I, $1) on conflict (operation_id) do nothing', v_table, v_cols, v_cols, v_table) using v_payload;
      else
        -- Is this table registered as carrying a cross-device sequence column?
        select column_name into v_seq_col from public.sequence_registry where table_name = v_table limit 1;

        select string_agg(format('%I = excluded.%I', k, k), ', ') into v_set from jsonb_object_keys(v_payload) k where k <> 'id';

        v_try := 0;
        loop
          begin
            if v_set is null then
              execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I, $1) on conflict (id) do nothing', v_table, v_cols, v_cols, v_table) using v_payload;
            else
              execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I, $1) on conflict (id) do update set %s', v_table, v_cols, v_cols, v_table, v_set) using v_payload;
            end if;
            exit; -- success
          exception when unique_violation then
            -- Only a registered sequence column may be auto-resolved; anything else is a real error.
            if v_seq_col is null then raise; end if;
            v_try := v_try + 1;
            if v_try > 100 then raise exception 'apply_bundle: could not allocate free %.% after 100 tries', v_table, v_seq_col; end if;

            v_val := v_payload->>v_seq_col;
            if v_val is null then raise; end if;

            -- Split into prefix + trailing numeric part (e.g. 'INV-1016' -> 'INV-' , '1016').
            v_num_txt := substring(v_val from '(\d+)$');
            if v_num_txt is null then raise; end if;
            v_prefix := left(v_val, length(v_val) - length(v_num_txt));
            v_width := length(v_num_txt);

            -- Next free value = max existing numeric suffix (same prefix) + 1, never below the client's.
            execute format(
              'select coalesce(max((substring(%I from ''(\d+)$''))::bigint), 0) from public.%I where %I like $1',
              v_seq_col, v_table, v_seq_col
            ) into v_maxnum using (v_prefix || '%');

            v_newnum := greatest(v_maxnum, v_num_txt::bigint) + 1;
            v_newval := v_prefix || lpad(v_newnum::text, v_width, '0');

            v_renumbered := v_renumbered || jsonb_build_object(
              'table', v_table, 'id', v_payload->>'id', 'column', v_seq_col,
              'old', v_val, 'new', v_newval
            );
            v_payload := jsonb_set(v_payload, array[v_seq_col], to_jsonb(v_newval));
          end;
        end loop;
      end if;
    end if;
    v_count := v_count + 1;
  end loop;

  v_result := jsonb_build_object('ok', true, 'action', p_action, 'rows_applied', v_count, 'renumbered', v_renumbered);
  insert into public.bundle_operations (operation_id, action, result) values (p_operation_id, p_action, v_result) on conflict (operation_id) do nothing;
  return v_result;
end;
$$;

grant execute on function public.apply_bundle(text, text, jsonb) to anon, authenticated;
