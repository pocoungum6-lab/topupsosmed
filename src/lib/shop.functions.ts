import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  NEW_MEMBER_PERCENT,
  getQuality,
  getService,
  isValidWhatsapp,
  normalizeWhatsapp,
  nominalsFor,
  priceFor,
  type NominalTable,
  type PriceTable,
  type QualityId,
  type ServiceId,
  type VoucherRule,
} from "./catalog";

const selectionSchema = z.object({
  platform: z.string().max(20),
  service: z.string().max(20),
  quality: z.string().max(2),
  quantity: z.number().int().positive(),
});

type Selection = z.infer<typeof selectionSchema>;

async function loadCatalogData() {
  const { loadPrices, loadSettings } = await import("./store.server");
  const [prices, settings] = await Promise.all([loadPrices(), loadSettings()]);
  return { prices, nominals: settings.nominals };
}

function computeSubtotal(
  { prices, nominals }: { prices: PriceTable; nominals: NominalTable },
  input: Selection,
) {
  const service = getService(input.platform, input.service);
  const quality = getQuality(input.quality);
  if (!service || !quality) return { ok: false as const, error: "Layanan tidak valid." };
  if (!nominalsFor(nominals, service.id).includes(input.quantity))
    return { ok: false as const, error: "Nominal tidak valid." };
  return {
    ok: true as const,
    subtotal: priceFor(prices, service.id as ServiceId, quality.id as QualityId, input.quantity),
  };
}

export const getStorefront = createServerFn({ method: "GET" }).handler(async () => {
  const { loadPrices, loadSettings } = await import("./store.server");
  const [prices, settings] = await Promise.all([loadPrices(), loadSettings()]);
  return {
    prices,
    nominals: settings.nominals,
    whatsapp: settings.whatsapp,
    qrisImageSrc: settings.qrisImageSrc,
  };
});

export type VoucherCheckResult =
  { ok: true; code: string; rule: VoucherRule } | { ok: false; error: string };

export const checkVoucher = createServerFn({ method: "POST" })
  .validator((d) => selectionSchema.extend({ code: z.string().max(60) }).parse(d))
  .handler(async ({ data }): Promise<VoucherCheckResult> => {
    const code = data.code.toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    if (!code) return { ok: false, error: "Masukkan kode voucher." };
    const price = computeSubtotal(await loadCatalogData(), data);
    if (!price.ok) return price;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: v } = await supabaseAdmin
      .from("vouchers")
      .select("*")
      .eq("code", code)
      .maybeSingle();
    if (!v || !v.active)
      return { ok: false, error: "Kode voucher tidak ditemukan atau tidak aktif." };
    if (v.expires_at && new Date(v.expires_at).getTime() < Date.now()) {
      return { ok: false, error: "Voucher sudah kedaluwarsa." };
    }
    if (v.quota != null && v.used >= v.quota)
      return { ok: false, error: "Kuota voucher sudah habis." };
    if (price.subtotal < v.min_order) {
      return {
        ok: false,
        error: `Minimal pembelian Rp ${v.min_order.toLocaleString("id-ID")} untuk voucher ini.`,
      };
    }
    return {
      ok: true,
      code,
      rule: {
        type: v.type === "fixed" ? "fixed" : "percent",
        value: v.value,
        maxDiscount: v.max_discount,
        minOrder: v.min_order,
      },
    };
  });

export const checkNewMember = createServerFn({ method: "POST" })
  .validator((d) => z.object({ whatsapp: z.string().max(30) }).parse(d))
  .handler(
    async ({ data }): Promise<{ ok: true; percent: number } | { ok: false; error: string }> => {
      const whatsapp = normalizeWhatsapp(data.whatsapp);
      if (!isValidWhatsapp(whatsapp)) {
        return {
          ok: false,
          error: "Isi nomor WhatsApp yang aktif dulu (langkah 6) untuk klaim promo.",
        };
      }
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { count, error } = await supabaseAdmin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("whatsapp", whatsapp)
        .neq("status", "cancelled");
      if (error) return { ok: false, error: "Gagal mengecek promo. Coba lagi." };
      if ((count ?? 0) > 0) {
        return {
          ok: false,
          error: "Promo New Member hanya untuk pesanan pertama nomor WhatsApp ini.",
        };
      }
      return { ok: true, percent: NEW_MEMBER_PERCENT };
    },
  );

export type CreatedOrder = {
  code: string;
  platform: string;
  service: string;
  quality: string;
  quantity: number;
  target: string;
  whatsapp: string;
  subtotal: number;
  discount: number;
  uniqueCode: number;
  total: number;
  voucherCode: string | null;
  promo: string | null;
};

function generateOrderCode() {
  const now = new Date();
  const date = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  let rand = "";
  for (const b of bytes) rand += alphabet[b % alphabet.length];
  return `TS${date}${rand}`;
}

export const createOrder = createServerFn({ method: "POST" })
  .validator((d) =>
    selectionSchema
      .extend({
        target: z.string().max(300),
        whatsapp: z.string().max(30),
        voucherCode: z.string().max(60).optional(),
        newMember: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(
    async ({ data }): Promise<{ ok: true; order: CreatedOrder } | { ok: false; error: string }> => {
      const price = computeSubtotal(await loadCatalogData(), data);
      if (!price.ok) return price;

      const target = data.target.trim();
      if (target.length < 2) return { ok: false, error: "Isi username / link dengan benar." };
      const whatsapp = normalizeWhatsapp(data.whatsapp);
      if (!isValidWhatsapp(whatsapp)) return { ok: false, error: "Nomor WhatsApp tidak valid." };

      const voucherCode = data.voucherCode?.toUpperCase().replace(/[^A-Z0-9_-]/g, "") || "";
      const newMemberPercent = !voucherCode && data.newMember ? NEW_MEMBER_PERCENT : 0;

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: row, error } = await supabaseAdmin.rpc("place_order", {
        p_order_code: generateOrderCode(),
        p_platform: data.platform,
        p_service: data.service,
        p_quality: data.quality,
        p_quantity: data.quantity,
        p_target: target,
        p_whatsapp: whatsapp,
        p_subtotal: price.subtotal,
        p_voucher_code: voucherCode,
        p_new_member_percent: newMemberPercent,
      });
      if (error || !row) {
        if (error?.message?.startsWith("USER:"))
          return { ok: false, error: error.message.slice(5) };
        console.error("place_order failed", error);
        return { ok: false, error: "Gagal membuat pesanan. Coba lagi sebentar." };
      }
      return {
        ok: true,
        order: {
          code: row.order_code,
          platform: row.platform,
          service: row.service,
          quality: row.quality,
          quantity: row.quantity,
          target: row.target,
          whatsapp: row.whatsapp,
          subtotal: row.subtotal,
          discount: row.discount,
          uniqueCode: row.unique_code,
          total: row.total,
          voucherCode: row.voucher_code,
          promo: row.promo,
        },
      };
    },
  );
