import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Percent, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAdminPrices, savePrices } from "@/lib/admin.functions";
import { QUALITIES, SERVICES, formatRupiah, type PriceTable, type ServiceId } from "@/lib/catalog";
import { cn } from "@/lib/utils";

const pricesQuery = queryOptions({
  queryKey: ["admin", "prices"],
  queryFn: () => getAdminPrices(),
});

export const Route = createFileRoute("/admin/prices")({
  loader: ({ context }) => context.queryClient.ensureQueryData(pricesQuery),
  head: () => ({
    meta: [
      { title: "Harga - Admin TopupSosmed" },
      { name: "description", content: "Ubah harga per kategori untuk setiap layanan." },
      { property: "og:title", content: "Harga - Admin TopupSosmed" },
      { property: "og:description", content: "Ubah harga per kategori untuk setiap layanan." },
    ],
  }),
  component: AdminPricesPage,
});

type Draft = Record<ServiceId, [string, string, string]>;

function toDraft(t: PriceTable): Draft {
  const d = {} as Draft;
  for (const s of SERVICES) d[s.id] = t[s.id].map(String) as [string, string, string];
  return d;
}

function AdminPricesPage() {
  const { data: saved } = useSuspenseQuery(pricesQuery);
  const queryClient = useQueryClient();
  const save = useServerFn(savePrices);
  const [draft, setDraft] = useState<Draft>(() => toDraft(saved));
  const [bulkPercent, setBulkPercent] = useState("");
  const [bulkCategory, setBulkCategory] = useState<number | "all">("all");
  const [pending, setPending] = useState(false);

  const isDirty = SERVICES.some((s) => draft[s.id].some((v, i) => Number(v) !== saved[s.id][i]));
  const invalid = SERVICES.some((s) =>
    draft[s.id].some((v) => v.trim() === "" || !(Number(v) >= 0)),
  );

  function setCell(id: ServiceId, i: number, value: string) {
    setDraft((d) => {
      const row = [...d[id]] as [string, string, string];
      row[i] = value.replace(/\D/g, "");
      return { ...d, [id]: row };
    });
  }

  function applyBulk() {
    const pct = Number(bulkPercent);
    if (!pct) return;
    setDraft((d) => {
      const next = { ...d };
      for (const s of SERVICES) {
        next[s.id] = next[s.id].map((v, i) =>
          bulkCategory === "all" || bulkCategory === i
            ? String(Math.max(0, Math.round(Number(v) * (1 + pct / 100))))
            : v,
        ) as [string, string, string];
      }
      return next;
    });
    setBulkPercent("");
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Harga per Kategori</h1>
          <p className="text-sm text-muted-foreground">
            Harga per 100 unit. Berlaku untuk semua platform (Instagram, TikTok, Facebook, Shopee).
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={!isDirty || pending}
            onClick={() => setDraft(toDraft(saved))}
          >
            <RotateCcw /> Batal
          </Button>
          <Button
            disabled={!isDirty || invalid || pending}
            onClick={async () => {
              setPending(true);
              try {
                const res = await save({
                  data: {
                    rows: SERVICES.map((s) => ({
                      serviceId: s.id,
                      prices: draft[s.id].map(Number) as [number, number, number],
                    })),
                  },
                });
                if (res.ok) {
                  toast.success(res.message);
                  await queryClient.invalidateQueries({ queryKey: ["admin", "prices"] });
                  await queryClient.invalidateQueries({ queryKey: ["storefront"] });
                } else toast.error(res.message);
              } catch {
                toast.error("Gagal menyimpan harga.");
              } finally {
                setPending(false);
              }
            }}
          >
            {pending && <Loader2 className="animate-spin" />}
            Simpan Semua Harga
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-4 text-sm">
        <Percent className="size-4 text-primary" aria-hidden="true" />
        <span className="font-semibold">Ubah cepat:</span>
        <label htmlFor="bulk-cat" className="sr-only">
          Kategori
        </label>
        <select
          id="bulk-cat"
          value={String(bulkCategory)}
          onChange={(e) =>
            setBulkCategory(e.target.value === "all" ? "all" : Number(e.target.value))
          }
          className="h-9 rounded-lg border bg-background px-2"
        >
          <option value="all">Semua kategori</option>
          {QUALITIES.map((q, i) => (
            <option key={q.id} value={i}>
              {q.name}
            </option>
          ))}
        </select>
        <label htmlFor="bulk-pct" className="sr-only">
          Persen perubahan
        </label>
        <Input
          id="bulk-pct"
          type="number"
          placeholder="+10 atau -5"
          value={bulkPercent}
          onChange={(e) => setBulkPercent(e.target.value)}
          className="h-9 w-32"
        />
        <span className="text-muted-foreground">%</span>
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          disabled={!Number(bulkPercent)}
          onClick={applyBulk}
        >
          Terapkan
        </Button>
        <span className="text-xs text-muted-foreground">Lalu klik Simpan Semua Harga.</span>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="px-4 py-3 font-semibold">Layanan</th>
              {QUALITIES.map((q) => (
                <th key={q.id} className="px-4 py-3 font-semibold">
                  {q.name}
                  <span className="block text-xs font-normal text-muted-foreground">
                    {q.origin}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SERVICES.map((s) => (
              <tr key={s.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-semibold">{s.name}</td>
                {QUALITIES.map((q, i) => {
                  const value = draft[s.id][i];
                  const changed = Number(value) !== saved[s.id][i];
                  return (
                    <td key={q.id} className="px-4 py-2">
                      <label htmlFor={`p-${s.id}-${q.id}`} className="sr-only">
                        Harga {s.name} {q.name}
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-muted-foreground">
                          Rp
                        </span>
                        <Input
                          id={`p-${s.id}-${q.id}`}
                          inputMode="numeric"
                          value={value}
                          onChange={(e) => setCell(s.id, i, e.target.value)}
                          className={cn(
                            "h-10 pl-9 font-semibold",
                            changed && "border-primary ring-1 ring-primary/40",
                          )}
                        />
                      </div>
                      {changed && (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          sebelumnya {formatRupiah(saved[s.id][i] ?? 0)}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
