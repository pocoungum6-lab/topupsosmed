-- Store settings (WhatsApp, QRIS)
CREATE TABLE public.settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.settings TO anon, authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read store settings" ON public.settings FOR SELECT TO anon, authenticated USING (true);

-- Prices per service per category (price per 100 units)
CREATE TABLE public.service_prices (
  service_id text PRIMARY KEY,
  price_a integer NOT NULL CHECK (price_a >= 0),
  price_b integer NOT NULL CHECK (price_b >= 0),
  price_c integer NOT NULL CHECK (price_c >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.service_prices TO anon, authenticated;
GRANT ALL ON public.service_prices TO service_role;
ALTER TABLE public.service_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read prices" ON public.service_prices FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.service_prices (service_id, price_a, price_b, price_c) VALUES
  ('followers', 10000, 25000, 50000),
  ('likes', 3000, 6000, 12000),
  ('views', 150, 300, 600),
  ('repost', 4000, 8000, 15000),
  ('share', 2000, 4000, 8000),
  ('save', 2000, 4000, 8000);

-- Vouchers (server-only)
CREATE TABLE public.vouchers (
  id bigserial PRIMARY KEY,
  code text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('percent','fixed')),
  value integer NOT NULL CHECK (value > 0),
  min_order integer NOT NULL DEFAULT 0,
  max_discount integer,
  quota integer,
  used integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.vouchers TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.vouchers_id_seq TO service_role;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

-- Orders (server-only)
CREATE TABLE public.orders (
  id bigserial PRIMARY KEY,
  order_code text NOT NULL UNIQUE,
  platform text NOT NULL,
  service text NOT NULL,
  quality text NOT NULL,
  quantity integer NOT NULL,
  target text NOT NULL,
  whatsapp text NOT NULL,
  subtotal integer NOT NULL,
  discount integer NOT NULL DEFAULT 0,
  total integer NOT NULL,
  voucher_code text,
  promo text,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_whatsapp_idx ON public.orders (whatsapp);
CREATE INDEX orders_created_at_idx ON public.orders (created_at DESC);
GRANT ALL ON public.orders TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.orders_id_seq TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Atomic order placement: validates & claims voucher or new-member promo, then inserts order.
CREATE OR REPLACE FUNCTION public.place_order(
  p_order_code text,
  p_platform text,
  p_service text,
  p_quality text,
  p_quantity integer,
  p_target text,
  p_whatsapp text,
  p_subtotal integer,
  p_voucher_code text,
  p_new_member_percent integer
) RETURNS public.orders
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v public.vouchers;
  v_discount integer := 0;
  v_code text := NULLIF(upper(trim(coalesce(p_voucher_code, ''))), '');
  v_promo text := NULL;
  v_row public.orders;
BEGIN
  IF v_code IS NOT NULL AND coalesce(p_new_member_percent, 0) > 0 THEN
    RAISE EXCEPTION 'USER:Pilih salah satu: voucher atau promo New Member.';
  END IF;

  IF v_code IS NOT NULL THEN
    SELECT * INTO v FROM public.vouchers WHERE code = v_code FOR UPDATE;
    IF NOT FOUND OR NOT v.active THEN
      RAISE EXCEPTION 'USER:Kode voucher tidak ditemukan atau tidak aktif.';
    END IF;
    IF v.expires_at IS NOT NULL AND v.expires_at < now() THEN
      RAISE EXCEPTION 'USER:Voucher sudah kedaluwarsa.';
    END IF;
    IF v.quota IS NOT NULL AND v.used >= v.quota THEN
      RAISE EXCEPTION 'USER:Kuota voucher sudah habis.';
    END IF;
    IF p_subtotal < v.min_order THEN
      RAISE EXCEPTION 'USER:Minimal pembelian Rp % untuk voucher ini.', to_char(v.min_order, 'FM999G999G999');
    END IF;
    IF v.type = 'percent' THEN
      v_discount := floor(p_subtotal * v.value / 100.0);
    ELSE
      v_discount := v.value;
    END IF;
    IF v.max_discount IS NOT NULL THEN
      v_discount := least(v_discount, v.max_discount);
    END IF;
    UPDATE public.vouchers SET used = used + 1 WHERE id = v.id;
    v_promo := 'voucher';
  ELSIF coalesce(p_new_member_percent, 0) > 0 THEN
    PERFORM pg_advisory_xact_lock(hashtext('new_member:' || p_whatsapp));
    IF EXISTS (SELECT 1 FROM public.orders WHERE whatsapp = p_whatsapp AND status <> 'cancelled') THEN
      RAISE EXCEPTION 'USER:Promo New Member hanya untuk pesanan pertama nomor WhatsApp ini.';
    END IF;
    v_discount := floor(p_subtotal * p_new_member_percent / 100.0);
    v_promo := 'new_member';
  END IF;

  v_discount := greatest(0, least(v_discount, p_subtotal));

  INSERT INTO public.orders (order_code, platform, service, quality, quantity, target, whatsapp,
    subtotal, discount, total, voucher_code, promo)
  VALUES (p_order_code, p_platform, p_service, p_quality, p_quantity, p_target, p_whatsapp,
    p_subtotal, v_discount, p_subtotal - v_discount, v_code, v_promo)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.place_order(text, text, text, text, integer, text, text, integer, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_order(text, text, text, text, integer, text, text, integer, text, integer) TO service_role;