import { useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createVoucher,
  deleteVoucher,
  listVouchers,
  setVoucherActive,
} from "@/lib/admin.functions";
import { formatRupiah } from "@/lib/catalog";
import { cn } from "@/lib/utils";

const vouchersQuery = queryOptions({
  queryKey: ["admin", "vouchers"],
  queryFn: () => listVouchers(),
});

export const Route = createFileRoute("/admin/vouchers")({
  loader: ({ context }) => context.queryClient.ensureQueryData(vouchersQuery),
  head: () => ({
    meta: [
      { title: "Voucher - Admin TopupSosmed" },
      { name: "description", content: "Buat dan kelola voucher diskon TopupSosmed." },
      { property: "og:title", content: "Voucher - Admin TopupSosmed" },
      { property: "og:description", content: "Buat dan kelola voucher diskon TopupSosmed." },
    ],
  }),
  component: AdminVouchersPage,
});

function AdminVouchersPage() {
  const { data: list } = useSuspenseQuery(vouchersQuery);
  const queryClient = useQueryClient();
  const toggle = useServerFn(setVoucherActive);
  const remove = useServerFn(deleteVoucher);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin", "vouchers"] });
  const dateFmt = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta",
  });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Voucher</h1>
        <p className="text-sm text-muted-foreground">
          Buat voucher diskon persen atau potongan nominal. Pelanggan cukup ketik kodenya di kolom
          voucher.
        </p>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[360px_1fr]">
        <VoucherForm onCreated={refresh} />

        {list.length === 0 ? (
          <p className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">
            Belum ada voucher.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {list.map((v) => {
              const expired = v.expires_at ? new Date(v.expires_at).getTime() < Date.now() : false;
              const soldOut = v.quota != null && v.used >= v.quota;
              return (
                <li
                  key={v.id}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold">{v.code}</span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-semibold",
                          v.active && !expired && !soldOut
                            ? "bg-success/15 text-success"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {!v.active
                          ? "Nonaktif"
                          : expired
                            ? "Kedaluwarsa"
                            : soldOut
                              ? "Habis"
                              : "Aktif"}
                      </span>
                    </p>
                    <p className="mt-1 text-sm font-semibold text-primary">
                      {v.type === "percent"
                        ? `Diskon ${v.value}%`
                        : `Potongan ${formatRupiah(v.value)}`}
                      {v.type === "percent" && v.max_discount != null && (
                        <span className="font-normal text-muted-foreground">
                          {" "}
                          (maks {formatRupiah(v.max_discount)})
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Min. order {formatRupiah(v.min_order)} &middot; Terpakai {v.used}
                      {v.quota != null ? `/${v.quota}` : " (tanpa batas)"}
                      {v.expires_at ? ` · s/d ${dateFmt.format(new Date(v.expires_at))}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await toggle({ data: { id: v.id, active: !v.active } });
                      refresh();
                    }}
                    className="h-9 rounded-lg border px-3 text-xs font-semibold hover:bg-muted"
                  >
                    {v.active ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                  <button
                    type="button"
                    aria-label={`Hapus voucher ${v.code}`}
                    onClick={async () => {
                      if (!window.confirm(`Hapus voucher ${v.code}?`)) return;
                      await remove({ data: { id: v.id } });
                      refresh();
                    }}
                    className="inline-flex size-9 items-center justify-center rounded-lg border text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function toInt(value: string) {
  const s = value.trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

function VoucherForm({ onCreated }: { onCreated: () => void }) {
  const create = useServerFn(createVoucher);
  const empty = { code: "", value: "", maxDiscount: "", minOrder: "0", quota: "", expiresAt: "" };
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [f, setF] = useState(empty);
  const [state, setState] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, setPending] = useState(false);
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }));

  return (
    <form
      className="flex flex-col gap-4 rounded-2xl border bg-card p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        try {
          const res = await create({
            data: {
              code: f.code,
              type,
              value: Number(f.value) || 0,
              minOrder: toInt(f.minOrder),
              maxDiscount: toInt(f.maxDiscount),
              quota: toInt(f.quota),
              expiresAt: f.expiresAt || null,
            },
          });
          setState(res);
          if (res.ok) {
            setF(empty);
            onCreated();
          }
        } catch {
          setState({ ok: false, message: "Gagal menyimpan voucher." });
        } finally {
          setPending(false);
        }
      }}
    >
      <h2 className="font-bold">Buat Voucher Baru</h2>
      <Field label="Kode Voucher" id="code">
        <Input
          id="code"
          required
          placeholder="HEMAT10"
          maxLength={40}
          className="uppercase"
          value={f.code}
          onChange={(e) => setF((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
        />
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Jenis Diskon</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["percent", "Persen (%)"],
              ["fixed", "Nominal (Rp)"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={type === id}
              onClick={() => setType(id)}
              className={cn(
                "h-9 rounded-lg border text-sm font-semibold",
                type === id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <Field label={type === "percent" ? "Besar Diskon (%)" : "Potongan (Rp)"} id="value">
        <Input
          id="value"
          type="number"
          min={1}
          max={type === "percent" ? 100 : undefined}
          required
          value={f.value}
          onChange={set("value")}
        />
      </Field>
      {type === "percent" && (
        <Field label="Maks. Potongan (Rp)" id="maxDiscount" hint="Kosongkan jika tanpa batas">
          <Input
            id="maxDiscount"
            type="number"
            min={0}
            value={f.maxDiscount}
            onChange={set("maxDiscount")}
          />
        </Field>
      )}
      <Field label="Minimal Order (Rp)" id="minOrder">
        <Input id="minOrder" type="number" min={0} value={f.minOrder} onChange={set("minOrder")} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Kuota Pemakaian" id="quota" hint="Kosong = tanpa batas">
          <Input id="quota" type="number" min={1} value={f.quota} onChange={set("quota")} />
        </Field>
        <Field label="Berlaku Sampai" id="expiresAt" hint="Opsional">
          <Input id="expiresAt" type="date" value={f.expiresAt} onChange={set("expiresAt")} />
        </Field>
      </div>

      {state?.message && (
        <p role="status" className={cn("text-sm", state.ok ? "text-success" : "text-destructive")}>
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        Simpan Voucher
      </Button>
    </form>
  );
}

function Field({
  label,
  id,
  hint,
  children,
}: {
  label: string;
  id: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
