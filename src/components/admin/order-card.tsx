import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  ORDER_STATUSES,
  formatNumber,
  formatRupiah,
  getPlatform,
  getQuality,
  getService,
} from "@/lib/catalog";
import { deleteOrder, updateOrder } from "@/lib/admin.functions";
import { promoLabel } from "@/components/site/payment-view";
import { cn } from "@/lib/utils";

export type AdminOrder = {
  id: number;
  order_code: string;
  platform: string;
  service: string;
  quality: string;
  quantity: number;
  target: string;
  whatsapp: string;
  subtotal: number;
  discount: number;
  unique_code: number;
  total: number;
  voucher_code: string | null;
  promo: string | null;
  status: string;
  notes: string | null;
  created_at: string;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-warning/25 text-warning-foreground",
  paid: "bg-accent text-accent-foreground",
  processing: "bg-primary/15 text-primary",
  done: "bg-success/15 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

function followUpMessage(order: AdminOrder, serviceLabel: string) {
  const intro: Record<string, string> = {
    pending: `Halo kak, kami dari TopupSosmed. Pesanan *${order.order_code}* (${serviceLabel} ${formatNumber(order.quantity)}) senilai *${formatRupiah(order.total)}* belum terbayar. Mohon transfer tepat sesuai nominal (termasuk kode unik) via QRIS di website lalu kirim bukti bayarnya ya kak.`,
    paid: `Halo kak, pembayaran pesanan *${order.order_code}* sudah kami terima. Pesanan akan segera diproses ya kak.`,
    processing: `Halo kak, pesanan *${order.order_code}* (${serviceLabel} ${formatNumber(order.quantity)}) sedang diproses. Mohon akun/postingan tidak di-private ya kak.`,
    done: `Halo kak, pesanan *${order.order_code}* sudah selesai. Terima kasih sudah order di TopupSosmed!`,
    cancelled: `Halo kak, pesanan *${order.order_code}* kami batalkan. Hubungi kami jika ada pertanyaan ya kak.`,
  };
  return intro[order.status] ?? intro["pending"]!;
}

export function OrderCard({ order }: { order: AdminOrder }) {
  const queryClient = useQueryClient();
  const update = useServerFn(updateOrder);
  const remove = useServerFn(deleteOrder);
  const [notes, setNotes] = useState(order.notes ?? "");

  const platform = getPlatform(order.platform);
  const service = getService(order.platform, order.service);
  const quality = getQuality(order.quality);
  const serviceLabel = `${platform?.name ?? order.platform} ${service?.name ?? order.service}`;
  const statusLabel = ORDER_STATUSES.find((s) => s.id === order.status)?.label ?? order.status;
  const waLink = `https://wa.me/${order.whatsapp}?text=${encodeURIComponent(followUpMessage(order, serviceLabel))}`;
  const created = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(order.created_at));

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });

  return (
    <article className="flex h-full flex-col gap-3 rounded-2xl border bg-card p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-sm font-bold">{order.order_code}</p>
          <p className="text-xs text-muted-foreground">{created} WIB</p>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-semibold",
            STATUS_STYLES[order.status] ?? "",
          )}
        >
          {statusLabel}
        </span>
      </header>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Layanan</dt>
        <dd className="font-semibold">
          {serviceLabel} &middot; {formatNumber(order.quantity)}
        </dd>
        <dt className="text-muted-foreground">Kualitas</dt>
        <dd>
          {quality?.name} ({quality?.warranty})
        </dd>
        <dt className="text-muted-foreground">Target</dt>
        <dd className="break-all">
          {/^https?:\/\//.test(order.target) ? (
            <a
              href={order.target}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              {order.target}
            </a>
          ) : (
            order.target
          )}
        </dd>
        <dt className="text-muted-foreground">WhatsApp</dt>
        <dd>+{order.whatsapp}</dd>
        <dt className="text-muted-foreground">Total</dt>
        <dd className="font-bold text-primary">
          {formatRupiah(order.total)}
          {order.discount > 0 && (
            <span className="ml-2 text-xs font-medium text-muted-foreground">
              ({promoLabel({ promo: order.promo, voucherCode: order.voucher_code })} -
              {formatRupiah(order.discount)})
            </span>
          )}
          {order.unique_code > 0 && (
            <span className="ml-2 text-xs font-medium text-muted-foreground">
              (kode unik +{formatRupiah(order.unique_code)})
            </span>
          )}
        </dd>
      </dl>

      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          await update({ data: { id: order.id, notes } });
          toast.success("Catatan disimpan");
          refresh();
        }}
      >
        <label htmlFor={`notes-${order.id}`} className="sr-only">
          Catatan admin
        </label>
        <input
          id={`notes-${order.id}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Catatan admin..."
          maxLength={500}
          className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-3 text-sm"
        />
        <button
          type="submit"
          className="h-9 rounded-lg border px-3 text-xs font-semibold hover:bg-muted"
        >
          Simpan
        </button>
      </form>

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t pt-3">
        <label htmlFor={`status-${order.id}`} className="sr-only">
          Ubah status
        </label>
        <select
          id={`status-${order.id}`}
          value={order.status}
          onChange={async (e) => {
            await update({ data: { id: order.id, status: e.target.value } });
            toast.success("Status diubah");
            refresh();
          }}
          className="h-9 flex-1 rounded-lg border bg-background px-2 text-sm font-medium"
        >
          {ORDER_STATUSES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <a
          href={waLink}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-success px-3 text-sm font-semibold text-success-foreground hover:opacity-90"
        >
          <MessageCircle className="size-4" aria-hidden="true" />
          Follow Up
        </a>
        <button
          type="button"
          aria-label={`Hapus pesanan ${order.order_code}`}
          onClick={async () => {
            if (!window.confirm(`Hapus pesanan ${order.order_code}?`)) return;
            await remove({ data: { id: order.id } });
            refresh();
          }}
          className="inline-flex size-9 items-center justify-center rounded-lg border text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
