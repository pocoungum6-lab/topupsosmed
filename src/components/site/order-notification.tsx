import { useEffect, useState } from "react";
import { ShoppingBag, X } from "lucide-react";
import { PLATFORMS, formatNumber, nominalsFor, type NominalTable } from "@/lib/catalog";

const NAMES = [
  "Rina", "Dimas", "Putri", "Andi", "Sari", "Bayu", "Nadia", "Fajar", "Aulia", "Rizky",
  "Dewi", "Agus", "Intan", "Yoga", "Mega", "Reza", "Tiara", "Hendra", "Salsa", "Fikri",
];
const CITIES = [
  "Jakarta", "Bandung", "Surabaya", "Medan", "Semarang", "Makassar", "Yogyakarta", "Malang",
  "Bekasi", "Depok", "Palembang", "Denpasar", "Bogor", "Tangerang", "Pekanbaru", "Solo",
];

type Notice = { name: string; city: string; item: string; ago: string };

const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)] as T;

function randomNotice(nominals: NominalTable): Notice {
  const platform = pick(PLATFORMS);
  const service = pick(platform.services);
  const options = nominalsFor(nominals, service.id);
  const qty = pick(options.slice(0, Math.min(6, options.length)));
  const minutes = Math.floor(Math.random() * 14) + 1;
  return {
    name: `${pick(NAMES)} ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}.`,
    city: pick(CITIES),
    item: `${formatNumber(qty)} ${service.name} ${platform.name}`,
    ago: minutes === 1 ? "baru saja" : `${minutes} menit lalu`,
  };
}

/** Small rotating "someone just ordered" popup in the bottom-left corner of the storefront. */
export function OrderNotification({ nominals }: { nominals: NominalTable }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [visible, setVisible] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (closed) return;
    let hideTimer: ReturnType<typeof setTimeout>;
    let nextTimer: ReturnType<typeof setTimeout>;
    const show = () => {
      setNotice(randomNotice(nominals));
      setVisible(true);
      hideTimer = setTimeout(() => setVisible(false), 5000);
      nextTimer = setTimeout(show, 12000 + Math.random() * 8000);
    };
    nextTimer = setTimeout(show, 4000);
    return () => {
      clearTimeout(hideTimer);
      clearTimeout(nextTimer);
    };
  }, [closed, nominals]);

  if (closed || !notice || !visible) return null;

  return (
    <div
      role="status"
      className="fixed top-[4.25rem] left-3 z-30 flex w-[calc(100%-1.5rem)] max-w-72 items-center gap-3 rounded-xl border bg-card/95 p-3 pr-8 shadow-lg backdrop-blur animate-in fade-in slide-in-from-left-4 motion-reduce:animate-none"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success">
        <ShoppingBag className="size-4" aria-hidden="true" />
      </span>
      <p className="min-w-0 text-xs leading-snug">
        <span className="font-bold">{notice.name}</span>{" "}
        <span className="text-muted-foreground">dari {notice.city}</span>
        <br />
        baru order <span className="font-semibold text-primary">{notice.item}</span>
        <br />
        <span className="text-[11px] text-muted-foreground">{notice.ago}</span>
      </p>
      <button
        type="button"
        aria-label="Tutup notifikasi"
        onClick={() => setClosed(true)}
        className="absolute top-1.5 right-1.5 rounded-md p-1 text-muted-foreground hover:bg-muted"
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
