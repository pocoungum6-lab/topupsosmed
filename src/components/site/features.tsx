import { Clock, Headphones, KeyRound, QrCode, ShieldCheck, Sparkles } from "lucide-react";

const features = [
  {
    icon: ShieldCheck,
    title: "Garansi Permanen",
    desc: "Kategori C (Indo Aktif) bergaransi permanen. Jika drop, kami isi ulang.",
  },
  {
    icon: KeyRound,
    title: "Tanpa Password",
    desc: "Cukup username / link. Akun kamu tetap aman 100%.",
  },
  {
    icon: Clock,
    title: "Proses Cepat",
    desc: "Pesanan mulai diproses dalam hitungan menit setelah pembayaran.",
  },
  { icon: QrCode, title: "Bayar QRIS", desc: "Satu QR untuk semua e-wallet dan mobile banking." },
  {
    icon: Headphones,
    title: "Admin Responsif",
    desc: "Konfirmasi dan bantuan langsung lewat WhatsApp.",
  },
  {
    icon: Sparkles,
    title: "Sejak 2016",
    desc: "Lebih dari satu dekade dipercaya pelanggan di seluruh Indonesia.",
  },
];

export function Features() {
  return (
    <section aria-labelledby="features-title" className="border-y bg-card px-4 py-14">
      <div className="mx-auto max-w-5xl">
        <h2
          id="features-title"
          className="text-center text-2xl font-extrabold tracking-tight md:text-3xl"
        >
          Kenapa Pilih Kami?
        </h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <li key={f.title} className="flex gap-4 rounded-2xl border bg-background p-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent">
                <f.icon className="size-5 text-primary" aria-hidden="true" />
              </span>
              <span>
                <span className="block font-bold">{f.title}</span>
                <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                  {f.desc}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
