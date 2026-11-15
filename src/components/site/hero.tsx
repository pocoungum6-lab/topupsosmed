import { BadgeCheck, KeyRound, QrCode, ShieldCheck } from "lucide-react";

const highlights = [
  { icon: BadgeCheck, title: "Sejak 2016", desc: "10 tahun melayani" },
  { icon: KeyRound, title: "Tanpa Password", desc: "Akun tetap aman" },
  { icon: ShieldCheck, title: "Garansi Permanen", desc: "Kategori Indo Aktif" },
  { icon: QrCode, title: "Bayar QRIS", desc: "Semua e-wallet & bank" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b bg-card">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-40 mx-auto h-80 max-w-3xl rounded-full bg-primary/15 blur-3xl"
      />
      <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 py-14 text-center md:py-20">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
          <BadgeCheck className="size-3.5" aria-hidden="true" />
          Topup Sosmed Terpercaya Sejak 2016
        </span>
        <h1 className="max-w-3xl text-balance text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
          Naikkan <span className="text-primary">Followers, Like &amp; View</span> Sosmed Kamu
        </h1>
        <p className="max-w-xl text-pretty leading-relaxed text-muted-foreground md:text-lg">
          Instagram, TikTok, Facebook &amp; Shopee. Proses cepat, tanpa password, harga mulai Rp 150
          dan pembayaran mudah lewat QRIS.
        </p>
        <a
          href="#order"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:bg-primary/90"
        >
          Order Sekarang
        </a>
        <ul className="mt-4 grid w-full max-w-3xl grid-cols-2 gap-3 md:grid-cols-4">
          {highlights.map((h) => (
            <li
              key={h.title}
              className="flex flex-col items-center gap-1 rounded-xl border bg-background p-4"
            >
              <h.icon className="size-5 text-primary" aria-hidden="true" />
              <span className="text-sm font-bold">{h.title}</span>
              <span className="text-xs text-muted-foreground">{h.desc}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
