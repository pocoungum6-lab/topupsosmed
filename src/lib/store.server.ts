import { DEFAULT_PRICES, type PriceTable, type ServiceId } from "./catalog";

export type StoreSettings = {
  whatsapp: string;
  qrisSource: "none" | "url" | "upload";
  qrisUrl: string;
  qrisImageSrc: string | null;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function loadPrices(): Promise<PriceTable> {
  const db = await admin();
  const { data, error } = await db
    .from("service_prices")
    .select("service_id, price_a, price_b, price_c");
  if (error) throw new Error(error.message);
  const table: PriceTable = { ...DEFAULT_PRICES };
  for (const row of data ?? []) {
    if (row.service_id in table) {
      table[row.service_id as ServiceId] = [row.price_a, row.price_b, row.price_c];
    }
  }
  return table;
}

export async function loadSettings(): Promise<StoreSettings> {
  const db = await admin();
  const { data, error } = await db.from("settings").select("key, value");
  if (error) throw new Error(error.message);
  const map = new Map((data ?? []).map((r) => [r.key, r.value]));
  const qrisSource = (map.get("qris_source") as StoreSettings["qrisSource"]) ?? "none";
  const qrisUrl = map.get("qris_url") ?? "";
  let qrisImageSrc: string | null = null;
  if (qrisSource === "url" && qrisUrl) qrisImageSrc = qrisUrl;
  else if (qrisSource === "upload" && map.get("qris_upload_version")) {
    qrisImageSrc = `/api/public/qris?v=${map.get("qris_upload_version")}`;
  }
  return { whatsapp: map.get("whatsapp") ?? "", qrisSource, qrisUrl, qrisImageSrc };
}

export async function setSetting(key: string, value: string) {
  const db = await admin();
  const { error } = await db
    .from("settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw new Error(error.message);
}
