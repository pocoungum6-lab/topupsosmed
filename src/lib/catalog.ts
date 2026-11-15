export type PlatformId = "instagram" | "tiktok" | "facebook" | "shopee";
export type TargetKind = "profile" | "post";
export type QualityId = "A" | "B" | "C";
export type ServiceId = "followers" | "likes" | "views" | "repost" | "share" | "save";

export type Quality = { id: QualityId; name: string; origin: string; warranty: string };

export type Service = {
  id: ServiceId;
  name: string;
  unit: string;
  target: TargetKind;
  nominals: number[];
};

export type Platform = {
  id: PlatformId;
  name: string;
  icon: string;
  postLabel: string;
  services: Service[];
};

/** Harga per 100 unit untuk kategori A, B, C. Diatur admin di menu Harga. */
export type PriceTriple = [number, number, number];
export type PriceTable = Record<ServiceId, PriceTriple>;

/** Persentase diskon promo New Member (pesanan pertama per nomor WhatsApp). */
export const NEW_MEMBER_PERCENT = 10;

export const QUALITIES: Quality[] = [
  { id: "A", name: "Kategori A", origin: "Akun Luar", warranty: "Tanpa Garansi" },
  { id: "B", name: "Kategori B", origin: "Mix Indo & Luar", warranty: "Garansi 30 Hari" },
  { id: "C", name: "Kategori C", origin: "Indo Aktif", warranty: "Garansi Permanen" },
];

const FOLLOWER_NOMINALS = [
  100, 200, 300, 400, 500, 700, 1000, 1500, 2000, 2500, 3000, 5000, 7000, 10000,
];
const ENGAGEMENT_NOMINALS = [100, 200, 300, 500, 1000, 2000, 3000, 5000, 10000];
const VIEW_NOMINALS = [1000, 2000, 3000, 5000, 10000, 20000, 50000, 100000];

const followers: Service = {
  id: "followers",
  name: "Followers",
  unit: "Followers",
  target: "profile",
  nominals: FOLLOWER_NOMINALS,
};
const likes: Service = {
  id: "likes",
  name: "Like",
  unit: "Like",
  target: "post",
  nominals: ENGAGEMENT_NOMINALS,
};
const views: Service = {
  id: "views",
  name: "View",
  unit: "View",
  target: "post",
  nominals: VIEW_NOMINALS,
};
const repost: Service = {
  id: "repost",
  name: "Repost",
  unit: "Repost",
  target: "post",
  nominals: ENGAGEMENT_NOMINALS,
};
const share: Service = {
  id: "share",
  name: "Share",
  unit: "Share",
  target: "post",
  nominals: ENGAGEMENT_NOMINALS,
};
const save: Service = {
  id: "save",
  name: "Save",
  unit: "Save",
  target: "post",
  nominals: ENGAGEMENT_NOMINALS,
};

export const SERVICES: Service[] = [followers, likes, views, repost, share, save];

export const DEFAULT_PRICES: PriceTable = {
  followers: [10000, 25000, 50000],
  likes: [3000, 6000, 12000],
  views: [150, 300, 600],
  repost: [4000, 8000, 15000],
  share: [2000, 4000, 8000],
  save: [2000, 4000, 8000],
};

export const PLATFORMS: Platform[] = [
  {
    id: "instagram",
    name: "Instagram",
    icon: "https://cdn.simpleicons.org/instagram",
    postLabel: "link postingan / reels",
    services: [followers, likes, views, repost, share, save],
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: "https://cdn.simpleicons.org/tiktok",
    postLabel: "link video",
    services: [followers, likes, views, repost, share, { ...save, name: "Save / Favorit" }],
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: "https://cdn.simpleicons.org/facebook",
    postLabel: "link postingan / video",
    services: [followers, likes, views, share],
  },
  {
    id: "shopee",
    name: "Shopee",
    icon: "https://cdn.simpleicons.org/shopee",
    postLabel: "link produk / video",
    services: [followers, likes, views],
  },
];

export function getPlatform(id: string) {
  return PLATFORMS.find((p) => p.id === id);
}

export function getService(platformId: string, serviceId: string) {
  return getPlatform(platformId)?.services.find((s) => s.id === serviceId);
}

export function getQuality(id: string) {
  return QUALITIES.find((q) => q.id === id);
}

export function priceFor(
  prices: PriceTable,
  serviceId: ServiceId,
  qualityId: QualityId,
  quantity: number,
) {
  const index = QUALITIES.findIndex((q) => q.id === qualityId);
  const per100 = (prices[serviceId] ?? DEFAULT_PRICES[serviceId])[index] ?? 0;
  return Math.round((per100 * quantity) / 100);
}

export function formatRupiah(value: number) {
  return "Rp " + value.toLocaleString("id-ID");
}

export function formatNumber(value: number) {
  return value.toLocaleString("id-ID");
}

export type VoucherRule = {
  type: "percent" | "fixed";
  value: number;
  maxDiscount: number | null;
  minOrder: number;
};

/** Potongan voucher; 0 jika subtotal belum memenuhi minimal order. */
export function calculateDiscount(voucher: VoucherRule, subtotal: number) {
  if (subtotal < voucher.minOrder) return 0;
  let discount =
    voucher.type === "percent" ? Math.floor((subtotal * voucher.value) / 100) : voucher.value;
  if (voucher.maxDiscount != null) discount = Math.min(discount, voucher.maxDiscount);
  return Math.max(0, Math.min(discount, subtotal));
}

export function newMemberDiscount(subtotal: number) {
  return Math.floor((subtotal * NEW_MEMBER_PERCENT) / 100);
}

export function normalizeWhatsapp(input: string) {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "62" + digits.slice(1);
  else if (digits.startsWith("8")) digits = "62" + digits;
  return digits;
}

export function isValidWhatsapp(normalized: string) {
  return /^62\d{8,13}$/.test(normalized);
}

export const ORDER_STATUSES = [
  { id: "pending", label: "Menunggu Bayar" },
  { id: "paid", label: "Sudah Bayar" },
  { id: "processing", label: "Diproses" },
  { id: "done", label: "Selesai" },
  { id: "cancelled", label: "Dibatalkan" },
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number]["id"];
