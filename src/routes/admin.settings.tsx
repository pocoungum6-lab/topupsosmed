import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link2, Loader2, MessageCircle, QrCode, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getAdminSettings,
  saveQrisUrl,
  updateWhatsapp,
  uploadQris,
  type FormResult,
} from "@/lib/admin.functions";
import { cn } from "@/lib/utils";

const settingsQuery = queryOptions({
  queryKey: ["admin", "settings"],
  queryFn: () => getAdminSettings(),
});

export const Route = createFileRoute("/admin/settings")({
  loader: ({ context }) => context.queryClient.ensureQueryData(settingsQuery),
  head: () => ({
    meta: [
      { title: "Pengaturan - Admin TopupSosmed" },
      { name: "description", content: "Ubah nomor WhatsApp dan gambar QRIS TopupSosmed." },
      { property: "og:title", content: "Pengaturan - Admin TopupSosmed" },
      { property: "og:description", content: "Ubah nomor WhatsApp dan gambar QRIS TopupSosmed." },
    ],
  }),
  component: AdminSettingsPage,
});

function useRefresh() {
  const qc = useQueryClient();
  return async () => {
    await qc.invalidateQueries({ queryKey: ["admin", "settings"] });
    await qc.invalidateQueries({ queryKey: ["storefront"] });
  };
}

function AdminSettingsPage() {
  const { data } = useSuspenseQuery(settingsQuery);
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Pengaturan</h1>
        <p className="text-sm text-muted-foreground">
          Ubah nomor WhatsApp konfirmasi dan gambar QRIS tanpa coding.
        </p>
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <WhatsappForm current={data.whatsapp} />
        <QrisSettings source={data.qrisSource} url={data.qrisUrl} imageSrc={data.qrisImageSrc} />
      </div>
    </div>
  );
}

function Status({ state }: { state: FormResult | null }) {
  if (!state?.message) return null;
  return (
    <p role="status" className={cn("text-sm", state.ok ? "text-success" : "text-destructive")}>
      {state.message}
    </p>
  );
}

function WhatsappForm({ current }: { current: string }) {
  const update = useServerFn(updateWhatsapp);
  const refresh = useRefresh();
  const [value, setValue] = useState("");
  const [state, setState] = useState<FormResult | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <form
      className="flex flex-col gap-4 rounded-2xl border bg-card p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        try {
          const res = await update({ data: { whatsapp: value } });
          setState(res);
          if (res.ok) {
            setValue("");
            await refresh();
          }
        } finally {
          setPending(false);
        }
      }}
    >
      <div>
        <h2 className="flex items-center gap-2 font-bold">
          <MessageCircle className="size-5 text-success" aria-hidden="true" />
          Nomor WhatsApp Konfirmasi
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pelanggan diarahkan ke nomor ini setelah order. Jika nomor diblokir, cukup ganti di sini.
        </p>
      </div>
      <p className="rounded-lg bg-muted px-3 py-2 text-sm">
        Saat ini: <strong>{current ? `+${current}` : "Belum diatur"}</strong>
      </p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="wa-new">Nomor baru</Label>
        <Input
          id="wa-new"
          type="tel"
          inputMode="tel"
          placeholder="08xxxxxxxxxx"
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Format 08... atau 62... otomatis disesuaikan.
        </p>
      </div>
      <Status state={state} />
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        Simpan Nomor
      </Button>
    </form>
  );
}

function QrisSettings({
  source,
  url,
  imageSrc,
}: {
  source: "none" | "url" | "upload";
  url: string;
  imageSrc: string | null;
}) {
  const saveUrl = useServerFn(saveQrisUrl);
  const upload = useServerFn(uploadQris);
  const refresh = useRefresh();
  const [mode, setMode] = useState<"url" | "upload">(source === "upload" ? "upload" : "url");
  const [urlValue, setUrlValue] = useState(url);
  const [state, setState] = useState<FormResult | null>(null);
  const [pending, setPending] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <section
      aria-labelledby="qris-title"
      className="flex flex-col gap-4 rounded-2xl border bg-card p-5"
    >
      <div>
        <h2 id="qris-title" className="flex items-center gap-2 font-bold">
          <QrCode className="size-5 text-primary" aria-hidden="true" />
          Gambar QRIS
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Gambar disimpan dalam ukuran asli (tanpa kompres) agar QR tidak pecah dan tetap bisa
          di-scan.
        </p>
      </div>

      <div className="flex flex-col items-center gap-2 rounded-xl bg-muted p-3">
        <span className="text-xs font-medium text-muted-foreground">
          QRIS aktif:{" "}
          {source === "url" ? "dari link" : source === "upload" ? "dari upload" : "belum ada"}
        </span>
        {imageSrc ? (
          <div className="rounded-lg bg-qr-surface p-2">
            <img src={imageSrc} alt="QRIS aktif" className="h-auto w-56 object-contain" />
          </div>
        ) : (
          <p className="py-8 text-sm text-muted-foreground">Belum ada gambar QRIS.</p>
        )}
      </div>

      <div role="tablist" aria-label="Sumber QRIS" className="grid grid-cols-2 gap-2">
        {(
          [
            ["url", "Link imgbb", Link2],
            ["upload", "Upload Gambar", Upload],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            onClick={() => {
              setMode(id);
              setState(null);
              setPreview(null);
            }}
            className={cn(
              "flex h-10 items-center justify-center gap-2 rounded-lg border text-sm font-semibold",
              mode === id ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {mode === "url" ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            try {
              const res = await saveUrl({ data: { url: urlValue } });
              setState(res);
              if (res.ok) await refresh();
            } finally {
              setPending(false);
            }
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="qris-url">Direct link gambar</Label>
            <Input
              id="qris-url"
              type="url"
              required
              value={urlValue}
              placeholder="https://i.ibb.co/xxxx/qris.png"
              onChange={(e) => {
                setUrlValue(e.target.value);
                setPreview(e.target.value.startsWith("https://") ? e.target.value : null);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Di imgbb pilih &quot;Embed codes&quot; &rarr; &quot;Direct links&quot;, lalu salin
              link yang diawali <code>https://i.ibb.co/</code>.
            </p>
          </div>
          {preview && preview !== url && (
            <div className="flex justify-center rounded-lg bg-qr-surface p-2">
              <img
                src={preview}
                alt="Pratinjau QRIS dari link"
                className="h-auto w-48 object-contain"
              />
            </div>
          )}
          <Status state={state} />
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Pakai QRIS dari Link
          </Button>
        </form>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            setPending(true);
            try {
              const res = await upload({ data: formData });
              setState(res);
              if (res.ok) {
                setPreview(null);
                await refresh();
              }
            } catch {
              setState({ ok: false, message: "Upload gagal." });
            } finally {
              setPending(false);
            }
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="qris-file">File gambar (PNG / JPG / WEBP, maks 4 MB)</Label>
            <Input
              id="qris-file"
              name="file"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              required
              onChange={(e) => {
                const f = e.target.files?.[0];
                setPreview(f ? URL.createObjectURL(f) : null);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Gunakan file asli QRIS (PNG disarankan) agar hasil paling tajam.
            </p>
          </div>
          {preview && (
            <div className="flex justify-center rounded-lg bg-qr-surface p-2">
              <img
                src={preview}
                alt="Pratinjau QRIS yang akan diupload"
                className="h-auto w-48 object-contain"
              />
            </div>
          )}
          <Status state={state} />
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Upload &amp; Pakai QRIS
          </Button>
        </form>
      )}
    </section>
  );
}
