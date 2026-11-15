import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { z } from "zod";
import { ORDER_STATUSES, formatRupiah } from "@/lib/catalog";
import { listOrders } from "@/lib/admin.functions";
import { OrderCard } from "@/components/admin/order-card";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  status: z.string().optional(),
  q: z.string().optional(),
});

const ordersQuery = (status?: string, q?: string) =>
  queryOptions({
    queryKey: ["admin", "orders", status ?? "", q ?? ""],
    queryFn: () => listOrders({ data: { status, q } }),
  });

export const Route = createFileRoute("/admin/")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ status: search.status, q: search.q }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(ordersQuery(deps.status, deps.q)),
  head: () => ({
    meta: [
      { title: "Pesanan - Admin TopupSosmed" },
      { name: "description", content: "Daftar pesanan pelanggan TopupSosmed." },
      { property: "og:title", content: "Pesanan - Admin TopupSosmed" },
      { property: "og:description", content: "Daftar pesanan pelanggan TopupSosmed." },
    ],
  }),
  component: AdminOrdersPage,
});

function AdminOrdersPage() {
  const { status, q } = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/" });
  const { data } = useSuspenseQuery(ordersQuery(status, q));
  const [query, setQuery] = useState(q ?? "");
  const c = (id: string) => data.counts[id] ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Pesanan</h1>
        <p className="text-sm text-muted-foreground">
          Follow up pesanan pelanggan dan ubah statusnya.
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total Pesanan" value={String(data.total)} />
        <Stat label="Menunggu Bayar" value={String(c("pending"))} highlight />
        <Stat label="Diproses" value={String(c("paid") + c("processing"))} />
        <Stat label="Pendapatan" value={formatRupiah(data.revenue)} />
      </dl>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <nav aria-label="Filter status" className="flex gap-1 overflow-x-auto">
          <FilterLink status={undefined} q={q} active={!status} label={`Semua (${data.total})`} />
          {ORDER_STATUSES.map((s) => (
            <FilterLink
              key={s.id}
              status={s.id}
              q={q}
              active={status === s.id}
              label={`${s.label} (${c(s.id)})`}
            />
          ))}
        </nav>
        <form
          className="flex gap-2"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            void navigate({ search: { status, q: query.trim() || undefined } });
          }}
        >
          <label htmlFor="q" className="sr-only">
            Cari pesanan
          </label>
          <input
            id="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari kode / target / WA"
            className="h-9 w-full rounded-lg border bg-card px-3 text-sm md:w-64"
          />
          <button
            type="submit"
            className="h-9 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground"
          >
            Cari
          </button>
        </form>
      </div>

      {data.list.length === 0 ? (
        <p className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">
          Belum ada pesanan.
        </p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {data.list.map((o) => (
            <li key={`${o.id}-${o.status}-${o.notes ?? ""}`}>
              <OrderCard order={o} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={cn("rounded-xl border bg-card p-4", highlight && "border-warning bg-warning/15")}
    >
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-lg font-extrabold">{value}</dd>
    </div>
  );
}

function FilterLink({
  status,
  q,
  active,
  label,
}: {
  status: string | undefined;
  q: string | undefined;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      to="/admin"
      search={{ status, q }}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
      )}
    >
      {label}
    </Link>
  );
}
