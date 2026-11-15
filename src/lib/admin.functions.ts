import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  MAX_NOMINAL_OPTIONS,
  MAX_NOMINAL_VALUE,
  ORDER_STATUSES,
  SERVICES,
  isValidWhatsapp,
  normalizeWhatsapp,
  parseNominalList,
} from "./catalog";

async function guard() {
  const { assertAdmin } = await import("./admin-auth.server");
  assertAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type FormResult = { ok: boolean; message: string };

/* ---------- Auth ---------- */

export const getAdminStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { isAdmin, isAdminConfigured } = await import("./admin-auth.server");
  return { loggedIn: isAdmin(), configured: isAdminConfigured() };
});

export const adminLogin = createServerFn({ method: "POST" })
  .validator((d) => z.object({ password: z.string().max(200) }).parse(d))
  .handler(async ({ data }): Promise<FormResult> => {
    const auth = await import("./admin-auth.server");
    if (!auth.isAdminConfigured()) return { ok: false, message: "Password admin belum diatur." };
    if (!auth.verifyPassword(data.password)) {
      await new Promise((r) => setTimeout(r, 600));
      return { ok: false, message: "Password salah." };
    }
    auth.createAdminSession();
    return { ok: true, message: "Berhasil masuk." };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  const { destroyAdminSession } = await import("./admin-auth.server");
  destroyAdminSession();
  return { ok: true };
});

/* ---------- Orders ---------- */

export const listOrders = createServerFn({ method: "GET" })
  .validator((d) =>
    z.object({ status: z.string().max(20).optional(), q: z.string().max(100).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const db = await guard();
    const status = ORDER_STATUSES.some((s) => s.id === data.status) ? data.status : undefined;
    const q = data.q?.trim().replace(/[,%()]/g, "");

    let query = db.from("orders").select("*").order("created_at", { ascending: false }).limit(100);
    if (status) query = query.eq("status", status);
    if (q) query = query.or(`order_code.ilike.%${q}%,target.ilike.%${q}%,whatsapp.ilike.%${q}%`);

    const [{ data: list, error }, { data: all, error: e2 }] = await Promise.all([
      query,
      db.from("orders").select("status, total"),
    ]);
    if (error || e2) throw new Error((error ?? e2)!.message);

    const counts: Record<string, number> = {};
    let revenue = 0;
    for (const o of all ?? []) {
      counts[o.status] = (counts[o.status] ?? 0) + 1;
      if (o.status === "paid" || o.status === "processing" || o.status === "done")
        revenue += o.total;
    }
    return { list: list ?? [], counts, total: all?.length ?? 0, revenue };
  });

export const updateOrder = createServerFn({ method: "POST" })
  .validator((d) =>
    z
      .object({
        id: z.number().int(),
        status: z.string().max(20).optional(),
        notes: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const db = await guard();
    const patch: { updated_at: string; status?: string; notes?: string } = {
      updated_at: new Date().toISOString(),
    };
    if (data.status !== undefined) {
      if (!ORDER_STATUSES.some((s) => s.id === data.status)) throw new Error("Status tidak valid.");
      patch.status = data.status;
    }
    if (data.notes !== undefined) patch.notes = data.notes;
    const { error } = await db.from("orders").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteOrder = createServerFn({ method: "POST" })
  .validator((d) => z.object({ id: z.number().int() }).parse(d))
  .handler(async ({ data }) => {
    const db = await guard();
    const { error } = await db.from("orders").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- Vouchers ---------- */

export const listVouchers = createServerFn({ method: "GET" }).handler(async () => {
  const db = await guard();
  const { data, error } = await db
    .from("vouchers")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

const optionalInt = z.number().int().min(0).nullable();

export const createVoucher = createServerFn({ method: "POST" })
  .validator((d) =>
    z
      .object({
        code: z.string().max(60),
        type: z.enum(["percent", "fixed"]),
        value: z.number().int(),
        minOrder: optionalInt,
        maxDiscount: optionalInt,
        quota: optionalInt,
        expiresAt: z.string().max(20).nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<FormResult> => {
    const db = await guard();
    const code = data.code.toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    if (!/^[A-Z0-9_-]{3,40}$/.test(code)) {
      return { ok: false, message: "Kode minimal 3 huruf/angka, contoh: DISKON50." };
    }
    if (data.value <= 0) return { ok: false, message: "Nilai diskon wajib diisi." };
    if (data.type === "percent" && data.value > 100)
      return { ok: false, message: "Diskon persen maksimal 100." };
    let expiresAt: string | null = null;
    if (data.expiresAt) {
      const d = new Date(`${data.expiresAt}T23:59:59+07:00`);
      if (Number.isNaN(d.getTime())) return { ok: false, message: "Tanggal tidak valid." };
      expiresAt = d.toISOString();
    }
    const { error } = await db.from("vouchers").insert({
      code,
      type: data.type,
      value: data.value,
      min_order: data.minOrder ?? 0,
      max_discount: data.type === "percent" ? data.maxDiscount : null,
      quota: data.quota && data.quota > 0 ? data.quota : null,
      expires_at: expiresAt,
    });
    if (error) {
      return {
        ok: false,
        message: error.code === "23505" ? "Kode voucher sudah dipakai." : error.message,
      };
    }
    return { ok: true, message: `Voucher ${code} dibuat dan langsung bisa dipakai.` };
  });

export const setVoucherActive = createServerFn({ method: "POST" })
  .validator((d) => z.object({ id: z.number().int(), active: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const db = await guard();
    const { error } = await db.from("vouchers").update({ active: data.active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteVoucher = createServerFn({ method: "POST" })
  .validator((d) => z.object({ id: z.number().int() }).parse(d))
  .handler(async ({ data }) => {
    const db = await guard();
    const { error } = await db.from("vouchers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- Prices ---------- */

export const getAdminPrices = createServerFn({ method: "GET" }).handler(async () => {
  await guard();
  const { loadPrices } = await import("./store.server");
  return loadPrices();
});

const priceValue = z.number().int().min(0).max(100_000_000);

export const savePrices = createServerFn({ method: "POST" })
  .validator((d) =>
    z
      .object({
        rows: z
          .array(
            z.object({
              serviceId: z.enum(SERVICES.map((s) => s.id) as [string, ...string[]]),
              prices: z.tuple([priceValue, priceValue, priceValue]),
            }),
          )
          .max(SERVICES.length),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<FormResult> => {
    const db = await guard();
    const now = new Date().toISOString();
    const { error } = await db.from("service_prices").upsert(
      data.rows.map((r) => ({
        service_id: r.serviceId,
        price_a: r.prices[0],
        price_b: r.prices[1],
        price_c: r.prices[2],
        updated_at: now,
      })),
      { onConflict: "service_id" },
    );
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: "Harga tersimpan dan langsung tampil di website." };
  });

/* ---------- Settings ---------- */

export const getAdminSettings = createServerFn({ method: "GET" }).handler(async () => {
  await guard();
  const { loadSettings } = await import("./store.server");
  return loadSettings();
});

export const updateWhatsapp = createServerFn({ method: "POST" })
  .validator((d) => z.object({ whatsapp: z.string().max(30) }).parse(d))
  .handler(async ({ data }): Promise<FormResult> => {
    await guard();
    const number = normalizeWhatsapp(data.whatsapp);
    if (!isValidWhatsapp(number)) return { ok: false, message: "Nomor WhatsApp tidak valid." };
    const { setSetting } = await import("./store.server");
    await setSetting("whatsapp", number);
    return { ok: true, message: `Nomor WhatsApp diubah ke +${number}.` };
  });

export const saveQrisUrl = createServerFn({ method: "POST" })
  .validator((d) => z.object({ url: z.string().max(500) }).parse(d))
  .handler(async ({ data }): Promise<FormResult> => {
    await guard();
    let parsed: URL;
    try {
      parsed = new URL(data.url.trim());
    } catch {
      return { ok: false, message: "Link tidak valid." };
    }
    if (parsed.protocol !== "https:") return { ok: false, message: "Link harus diawali https://" };
    if (parsed.hostname === "ibb.co" || parsed.hostname === "www.ibb.co") {
      return {
        ok: false,
        message: 'Itu link halaman imgbb. Pakai "Direct link" yang diawali https://i.ibb.co/...',
      };
    }
    const { setSetting } = await import("./store.server");
    await setSetting("qris_url", parsed.toString());
    await setSetting("qris_source", "url");
    return { ok: true, message: "QRIS dari link berhasil disimpan." };
  });

export const saveNominals = createServerFn({ method: "POST" })
  .validator((d) =>
    z
      .object({
        rows: z
          .array(
            z.object({
              serviceId: z.enum(SERVICES.map((s) => s.id) as [string, ...string[]]),
              nominals: z
                .array(z.number().int().min(1).max(MAX_NOMINAL_VALUE))
                .min(1)
                .max(MAX_NOMINAL_OPTIONS),
            }),
          )
          .max(SERVICES.length),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<FormResult> => {
    await guard();
    const { loadSettings, setSetting } = await import("./store.server");
    const table = { ...(await loadSettings()).nominals };
    for (const row of data.rows) {
      const parsed = parseNominalList(row.nominals.join(","));
      if (!parsed.ok) return { ok: false, message: parsed.error };
      table[row.serviceId as keyof typeof table] = parsed.values;
    }
    await setSetting("nominals", JSON.stringify(table));
    return { ok: true, message: "Pilihan nominal tersimpan dan langsung tampil di website." };
  });

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 4 * 1024 * 1024;

export const uploadQris = createServerFn({ method: "POST" })
  .validator((d) => {
    if (!(d instanceof FormData)) throw new Error("Data tidak valid.");
    return d;
  })
  .handler(async ({ data }): Promise<FormResult> => {
    const db = await guard();
    const file = data.get("file");
    if (!(file instanceof File) || file.size === 0)
      return { ok: false, message: "Pilih gambar terlebih dahulu." };
    if (!ALLOWED_TYPES.includes(file.type))
      return { ok: false, message: "Format harus PNG, JPG, atau WEBP." };
    if (file.size > MAX_BYTES) return { ok: false, message: "Ukuran maksimal 4 MB." };
    // Disimpan apa adanya (tanpa kompresi) agar QR tetap tajam dan bisa di-scan.
    const { error } = await db.storage
      .from("qris")
      .upload("qris", await file.arrayBuffer(), { contentType: file.type, upsert: true });
    if (error) return { ok: false, message: `Upload gagal: ${error.message}` };
    const { setSetting } = await import("./store.server");
    await setSetting("qris_upload_version", String(Date.now()));
    await setSetting("qris_source", "upload");
    return { ok: true, message: "QRIS berhasil diupload." };
  });
