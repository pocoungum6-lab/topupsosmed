ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS unique_code integer NOT NULL DEFAULT 0;

CREATE SEQUENCE IF NOT EXISTS public.order_unique_code_seq MINVALUE 1 MAXVALUE 999 START 1 CYCLE;
GRANT USAGE, SELECT ON SEQUENCE public.order_unique_code_seq TO service_role;

CREATE OR REPLACE FUNCTION public.place_order(p_order_code text, p_platform text, p_service text, p_quality text, p_quantity integer, p_target text, p_whatsapp text, p_subtotal integer, p_voucher_code text, p_new_member_percent integer)
 RETURNS orders
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v public.vouchers;
  v_discount integer := 0;
  v_code text := NULLIF(upper(trim(coalesce(p_voucher_code, ''))), '');
  v_promo text := NULL;
  v_unique integer;
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
  v_unique := nextval('public.order_unique_code_seq')::integer;

  INSERT INTO public.orders (order_code, platform, service, quality, quantity, target, whatsapp,
    subtotal, discount, unique_code, total, voucher_code, promo)
  VALUES (p_order_code, p_platform, p_service, p_quality, p_quantity, p_target, p_whatsapp,
    p_subtotal, v_discount, v_unique, p_subtotal - v_discount + v_unique, v_code, v_promo)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$function$;