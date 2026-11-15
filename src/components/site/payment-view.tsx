import { CheckCircle2, MessageCircle, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CreatedOrder } from "@/lib/shop.functions";
import {
  NEW_MEMBER_PERCENT,
  formatNumber,
  formatRupiah,
  getPlatform,
  getQuality,
  getService,
} from "@/lib/catalog";

export function promoLabel(order: { promo: string | null; voucherCode: string | null }) {
  if (order.promo === "new_member") return `New Member ${NEW_MEMBER_PERCENT}%`;
  return order.voucherCode ? `Voucher ${order.voucherCode}` : "Diskon";
}

export function PaymentView({
  order,
  adminWhatsapp,
  qrisImageSrc,
  onNewOrder,
}: {
  order: CreatedOrder;
  adminWhatsapp: string;
  qrisImageSrc: string | null;
  onNewOrder: () => void;
}) {
  const platform = getPlatform(order.platform);
  const service = getService(order.platform, order.service);
  const quality = getQuality(order.quality);
  const serviceLabel = `${platform?.name ?? order.platform} ${service?.name ?? order.service}`;

  const message = [
    "Halo admin, saya sudah membuat pesanan:",
    "",
    `Kode: ${order.code}`,
    `Layanan: ${serviceLabel}`,
    `Kualitas: ${quality?.name} (${quality?.origin} - ${quality?.warranty})`,
    `Jumlah: ${formatNumber(order.quantity)}`,
    `Target: ${order.target}`,
    order.discount > 0 ? `${promoLabel(order)}: -${formatRupiah(order.discount)}` : null,
    order.uniqueCode > 0 ? `Kode Unik: +${formatRupiah(order.uniqueCode)}` : null,
    `Total: ${formatRupiah(order.total)}`,
    "",
    "Berikut bukti pembayaran QRIS saya.",
  ]
    .filter((line) => line !== null)
    .join("\n");

  const waLink = adminWhatsapp
    ? `https://wa.me/${adminWhatsapp}?text=${encodeURIComponent(message)}`
    : null;

  const rows: [string, string][] = [
    ["Kode Pesanan", order.code],
    ["Layanan", serviceLabel],
    ["Kualitas", `${quality?.name} - ${quality?.warranty}`],
    ["Jumlah", formatNumber(order.quantity)],
    ["Target", order.target],
    ["Subtotal", formatRupiah(order.subtotal)],
  ];
  if (order.discount > 0) rows.push([promoLabel(order), `-${formatRupiah(order.discount)}`]);
  if (order.uniqueCode > 0) rows.push(["Kode Unik", `+${formatRupiah(order.uniqueCode)}`]);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <CheckCircle2 className="size-10 text-success" aria-hidden="true" />
        <h2 className="text-2xl font-extrabold tracking-tight">Pesanan Dibuat</h2>
        <p className="text-sm text-muted-foreground">
          Scan QRIS di bawah, bayar sesuai total, lalu kirim bukti ke WhatsApp admin.
        </p>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2 font-bold">
            <QrCode className="size-5 text-primary" aria-hidden="true" /> Bayar via QRIS
          </span>
          <span className="text-lg font-extrabold text-primary">{formatRupiah(order.total)}</span>
        </div>
        {order.uniqueCode > 0 && (
          <p className="mb-3 rounded-lg bg-warning/20 px-3 py-2 text-xs font-medium text-warning-foreground">
            Transfer <b>tepat {formatRupiah(order.total)}</b> sampai 3 digit terakhir. Kode unik
            (+{formatRupiah(order.uniqueCode)}) membantu kami mengecek pembayaranmu dan
            mencegah bukti transfer palsu.
          </p>
        )}
        {qrisImageSrc ? (
          <div className="flex justify-center rounded-xl bg-qr-surface p-3">
            <img
              src={qrisImageSrc}
              alt="Kode QRIS pembayaran TopupSosmed"
              className="h-auto w-full max-w-[340px] object-contain"
              decoding="async"
            />
          </div>
        ) : (
          <p className="rounded-xl bg-muted p-6 text-center text-sm text-muted-foreground">
            QRIS sedang diperbarui. Silakan hubungi admin via WhatsApp untuk pembayaran.
          </p>
        )}
        {qrisImageSrc && (
          <a
            href={qrisImageSrc}
            download="qris-topupsosmed"
            target="_blank"
            rel="noreferrer"
            className="mt-2 block text-center text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            Buka / simpan gambar QRIS
          </a>
        )}
      </div>

      <dl className="divide-y rounded-2xl border bg-card text-sm shadow-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 px-4 py-2.5">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="break-all text-right font-semibold">{value}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-4 px-4 py-3">
          <dt className="font-bold">Total Bayar</dt>
          <dd className="font-extrabold text-primary">{formatRupiah(order.total)}</dd>
        </div>
      </dl>

      {waLink && (
        <a
          href={waLink}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-success font-bold text-success-foreground shadow-lg transition hover:opacity-90"
        >
          <MessageCircle className="size-5" aria-hidden="true" />
          Konfirmasi via WhatsApp
        </a>
      )}
      <Button variant="outline" className="h-11 rounded-xl" onClick={onNewOrder}>
        Buat Pesanan Lain
      </Button>
    </div>
  );
}
