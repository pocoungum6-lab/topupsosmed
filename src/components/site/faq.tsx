const faqs = [
  {
    q: "Apakah perlu password akun?",
    a: "Tidak. Untuk followers cukup username / link profil, sedangkan like, view, repost, share dan save cukup link postingan / link video.",
  },
  {
    q: "Apa maksud garansi permanen?",
    a: "Untuk Kategori C (Indo Aktif), jika jumlah berkurang kapan pun, hubungi admin dengan kode pesanan dan kami akan isi ulang tanpa biaya.",
  },
  {
    q: "Bagaimana cara bayar?",
    a: "Setelah membuat pesanan, scan QRIS yang muncul menggunakan e-wallet atau m-banking, lalu kirim bukti bayar ke WhatsApp admin.",
  },
  {
    q: "Berapa lama prosesnya?",
    a: "Umumnya mulai berjalan beberapa menit setelah pembayaran dikonfirmasi, tergantung jumlah pesanan.",
  },
  {
    q: "Akun harus public?",
    a: "Ya, pastikan akun tidak di-private selama proses agar pesanan bisa masuk.",
  },
];

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="scroll-mt-16 px-4 py-14">
      <div className="mx-auto max-w-2xl">
        <h2
          id="faq-title"
          className="text-center text-2xl font-extrabold tracking-tight md:text-3xl"
        >
          Pertanyaan Umum
        </h2>
        <div className="mt-8 flex flex-col gap-3">
          {faqs.map((f) => (
            <details key={f.q} className="group rounded-xl border bg-card p-4 open:shadow-sm">
              <summary className="cursor-pointer list-none font-semibold marker:hidden">
                <span className="flex items-center justify-between gap-3">
                  {f.q}
                  <span aria-hidden="true" className="text-primary transition group-open:rotate-45">
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
