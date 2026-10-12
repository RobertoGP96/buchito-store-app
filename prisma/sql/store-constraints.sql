-- CHECKs e índices parciales que `prisma db push` no gestiona.
-- Idempotente: se puede aplicar tantas veces como haga falta.
--   pnpm db:constraints

-- ===================== CATALOG =====================

ALTER TABLE product_variants DROP CONSTRAINT IF EXISTS chk_variant_stock_nonneg;
ALTER TABLE product_variants ADD CONSTRAINT chk_variant_stock_nonneg CHECK (stock >= 0);

ALTER TABLE product_variants DROP CONSTRAINT IF EXISTS chk_variant_price_nonneg;
ALTER TABLE product_variants ADD CONSTRAINT chk_variant_price_nonneg CHECK (price >= 0);

ALTER TABLE product_variants DROP CONSTRAINT IF EXISTS chk_variant_compare_at;
ALTER TABLE product_variants ADD CONSTRAINT chk_variant_compare_at
  CHECK (compare_at_price IS NULL OR compare_at_price > price);

-- Una sola variante por defecto por producto.
CREATE UNIQUE INDEX IF NOT EXISTS uq_variant_default_per_product
  ON product_variants (product_id) WHERE is_default;

ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS chk_movement_qty_pos;
ALTER TABLE stock_movements ADD CONSTRAINT chk_movement_qty_pos CHECK (quantity > 0);

ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS chk_movement_stock_after_nonneg;
ALTER TABLE stock_movements ADD CONSTRAINT chk_movement_stock_after_nonneg CHECK (stock_after >= 0);

ALTER TABLE categories DROP CONSTRAINT IF EXISTS chk_category_not_self_parent;
ALTER TABLE categories ADD CONSTRAINT chk_category_not_self_parent
  CHECK (parent_id IS DISTINCT FROM category_id);

-- @@unique([parentId, name]) no cubre las raíces porque parent_id es NULL.
CREATE UNIQUE INDEX IF NOT EXISTS uq_category_root_name
  ON categories (lower(name)) WHERE parent_id IS NULL;

-- ===================== CUSTOMERS =====================

CREATE UNIQUE INDEX IF NOT EXISTS uq_address_default_per_customer
  ON customer_addresses (customer_id) WHERE is_default;

-- Un teléfono = una cuenta; los invitados pueden repetir teléfono.
CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_phone_with_account
  ON customers (normalized_phone) WHERE user_id IS NOT NULL;

-- ===================== CURRENCY =====================

ALTER TABLE currencies DROP CONSTRAINT IF EXISTS chk_currency_decimals;
ALTER TABLE currencies ADD CONSTRAINT chk_currency_decimals
  CHECK (decimal_places BETWEEN 0 AND 8);

ALTER TABLE exchange_rates DROP CONSTRAINT IF EXISTS chk_rate_pos;
ALTER TABLE exchange_rates ADD CONSTRAINT chk_rate_pos CHECK (rate > 0);

ALTER TABLE exchange_rates DROP CONSTRAINT IF EXISTS chk_rate_distinct_pair;
ALTER TABLE exchange_rates ADD CONSTRAINT chk_rate_distinct_pair
  CHECK (base_currency_id <> quote_currency_id);

ALTER TABLE exchange_rate_history DROP CONSTRAINT IF EXISTS chk_rate_history_pos;
ALTER TABLE exchange_rate_history ADD CONSTRAINT chk_rate_history_pos CHECK (new_rate > 0);

-- ===================== PAYMENTS =====================

ALTER TABLE payment_methods DROP CONSTRAINT IF EXISTS chk_payment_method_surcharge;
ALTER TABLE payment_methods ADD CONSTRAINT chk_payment_method_surcharge
  CHECK (surcharge_percent IS NULL OR surcharge_percent >= 0);

ALTER TABLE order_payments DROP CONSTRAINT IF EXISTS chk_order_payment_amounts;
ALTER TABLE order_payments ADD CONSTRAINT chk_order_payment_amounts
  CHECK (amount_tendered > 0 AND exchange_rate > 0 AND amount_base > 0);

-- ===================== ORDERS =====================

ALTER TABLE orders DROP CONSTRAINT IF EXISTS chk_order_amounts_nonneg;
ALTER TABLE orders ADD CONSTRAINT chk_order_amounts_nonneg
  CHECK (subtotal >= 0 AND shipping_fee >= 0 AND discount >= 0
         AND payment_surcharge >= 0 AND total >= 0 AND paid_base >= 0
         AND total_in_payment_currency >= 0);

ALTER TABLE orders DROP CONSTRAINT IF EXISTS chk_order_payment_rate_pos;
ALTER TABLE orders ADD CONSTRAINT chk_order_payment_rate_pos CHECK (payment_exchange_rate > 0);

ALTER TABLE orders DROP CONSTRAINT IF EXISTS chk_order_delivery_address;
ALTER TABLE orders ADD CONSTRAINT chk_order_delivery_address
  CHECK (fulfillment = 'pickup' OR delivery_address IS NOT NULL);

ALTER TABLE order_lines DROP CONSTRAINT IF EXISTS chk_order_line_amounts;
ALTER TABLE order_lines ADD CONSTRAINT chk_order_line_amounts
  CHECK (qty > 0 AND unit_price >= 0 AND line_total >= 0);

-- El trío de moneda original va completo o va vacío.
ALTER TABLE order_lines DROP CONSTRAINT IF EXISTS chk_order_line_orig_trio;
ALTER TABLE order_lines ADD CONSTRAINT chk_order_line_orig_trio
  CHECK ((orig_currency_id IS NULL) = (orig_unit_price IS NULL)
         AND (orig_currency_id IS NULL) = (exchange_rate IS NULL));

ALTER TABLE coupons DROP CONSTRAINT IF EXISTS chk_coupon_values;
ALTER TABLE coupons ADD CONSTRAINT chk_coupon_values
  CHECK (value > 0 AND used_count >= 0 AND (max_uses IS NULL OR used_count <= max_uses));

-- ===================== DELIVERIES =====================

ALTER TABLE delivery_zones DROP CONSTRAINT IF EXISTS chk_zone_fee_nonneg;
ALTER TABLE delivery_zones ADD CONSTRAINT chk_zone_fee_nonneg CHECK (fee >= 0);

ALTER TABLE deliveries DROP CONSTRAINT IF EXISTS chk_delivery_failed_reason;
ALTER TABLE deliveries ADD CONSTRAINT chk_delivery_failed_reason
  CHECK (status <> 'failed' OR failed_reason IS NOT NULL);

ALTER TABLE deliveries DROP CONSTRAINT IF EXISTS chk_delivery_courier_required;
ALTER TABLE deliveries ADD CONSTRAINT chk_delivery_courier_required
  CHECK (status NOT IN ('assigned', 'in_transit', 'delivered') OR courier_id IS NOT NULL);

ALTER TABLE deliveries DROP CONSTRAINT IF EXISTS chk_delivery_attempts_nonneg;
ALTER TABLE deliveries ADD CONSTRAINT chk_delivery_attempts_nonneg CHECK (attempts >= 0);

-- ===================== COSTOS Y COMBOS =====================

ALTER TABLE product_variants DROP CONSTRAINT IF EXISTS chk_variant_cost;
ALTER TABLE product_variants ADD CONSTRAINT chk_variant_cost
  CHECK (cost IS NULL OR cost >= 0);

-- El costo y su moneda van juntos o no van.
ALTER TABLE product_variants DROP CONSTRAINT IF EXISTS chk_variant_cost_currency;
ALTER TABLE product_variants ADD CONSTRAINT chk_variant_cost_currency
  CHECK ((cost IS NULL) = (cost_currency_id IS NULL));

ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS chk_movement_unit_cost;
ALTER TABLE stock_movements ADD CONSTRAINT chk_movement_unit_cost
  CHECK ((unit_cost IS NULL OR unit_cost >= 0) AND ((unit_cost IS NULL) = (cost_currency_id IS NULL)));

ALTER TABLE combos DROP CONSTRAINT IF EXISTS chk_combo_price_nonneg;
ALTER TABLE combos ADD CONSTRAINT chk_combo_price_nonneg CHECK (price >= 0);

ALTER TABLE combos DROP CONSTRAINT IF EXISTS chk_combo_dates;
ALTER TABLE combos ADD CONSTRAINT chk_combo_dates
  CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at >= starts_at);

ALTER TABLE combo_items DROP CONSTRAINT IF EXISTS chk_combo_item_qty_pos;
ALTER TABLE combo_items ADD CONSTRAINT chk_combo_item_qty_pos CHECK (qty > 0);

ALTER TABLE order_lines DROP CONSTRAINT IF EXISTS chk_order_line_unit_cost;
ALTER TABLE order_lines ADD CONSTRAINT chk_order_line_unit_cost
  CHECK (unit_cost IS NULL OR unit_cost >= 0);

-- El snapshot de combo va completo o vacío.
ALTER TABLE order_lines DROP CONSTRAINT IF EXISTS chk_order_line_combo_trio;
ALTER TABLE order_lines ADD CONSTRAINT chk_order_line_combo_trio
  CHECK ((combo_id IS NULL) = (combo_name IS NULL)
         AND (combo_id IS NULL) = (combo_qty IS NULL)
         AND (combo_qty IS NULL OR combo_qty > 0));

-- ===================== PAGOS A MENSAJEROS =====================

ALTER TABLE couriers DROP CONSTRAINT IF EXISTS chk_courier_delivery_fee_nonneg;
ALTER TABLE couriers ADD CONSTRAINT chk_courier_delivery_fee_nonneg CHECK (delivery_fee >= 0);

ALTER TABLE deliveries DROP CONSTRAINT IF EXISTS chk_delivery_courier_fee_nonneg;
ALTER TABLE deliveries ADD CONSTRAINT chk_delivery_courier_fee_nonneg CHECK (courier_fee >= 0);

ALTER TABLE courier_payments DROP CONSTRAINT IF EXISTS chk_courier_payment_amounts;
ALTER TABLE courier_payments ADD CONSTRAINT chk_courier_payment_amounts
  CHECK (amount_base > 0 AND fees_base >= 0 AND delivery_count >= 0);
