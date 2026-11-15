import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Gift, Info, Link2, Loader2, QrCode, TicketPercent, UserRound, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { StepCard } from "@/components/site/step-card";
import { PaymentView } from "@/components/site/payment-view";
import { checkNewMember, checkVoucher, createOrder, type CreatedOrder } from "@/lib/shop.functions";
import {
  NEW_MEMBER_PERCENT,
  PLATFORMS,
  QUALITIES,
  calculateDiscount,
  formatNumber,
  formatRupiah,
  getPlatform,
  newMemberDiscount,
  nominalsFor,
  priceFor,
  type NominalTable,
  type PlatformId,
  type PriceTable,
  type ServiceId,
  type QualityId,
  type VoucherRule,
} from "@/lib/catalog";
import { cn } from "@/lib/utils";

type Promo = { kind: "voucher"; code: string; rule: VoucherRule } | { kind: "new_member" };

export function OrderForm({
  prices,
  nominals,
  adminWhatsapp,
  qrisImageSrc,
}: {
  prices: PriceTable;
  nominals: NominalTable;
  adminWhatsapp: string;
  qrisImageSrc: string | null;
}) {
  const [platformId, setPlatformId] = useState<PlatformId>("instagram");
  const platform = getPlatform(platformId)!;
  const [serviceId, setServiceId] = useState<string>(platform.services[0]!.id);
  const service = platform.services.find((s) => s.id === serviceId) ?? platform.services[0]!;
  const [qualityId, setQualityId] = useState<QualityId>("C");
  const optionsFor = (id: ServiceId) => nominalsFor(nominals, id);
  const serviceNominals = optionsFor(service.id);
  const [quantity, setQuantity] = useState(serviceNominals[0]!);
  const [target, setTarget] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [voucherInput, setVoucherInput] = useState("");
  const [promo, setPromo] = useState<Promo | null>(null);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const checkVoucherFn = useServerFn(checkVoucher);
  const checkNewMemberFn = useServerFn(checkNewMember);
  const createOrderFn = useServerFn(createOrder);

  const effectiveQuantity = serviceNominals.includes(quantity) ? quantity : serviceNominals[0]!;
  const subtotal = priceFor(prices, service.id, qualityId, effectiveQuantity);
  const discount = !promo
    ? 0
    : promo.kind === "voucher"
      ? calculateDiscount(promo.rule, subtotal)
      : newMemberDiscount(subtotal);
  const total = subtotal - discount;
  const isProfile = service.target === "profile";
  const belowMinOrder = promo?.kind === "voucher" && subtotal < promo.rule.minOrder;

  function selectPlatform(id: PlatformId) {
    const next = getPlatform(id)!;
    setPlatformId(id);
    const nextService = next.services.find((s) => s.id === serviceId) ?? next.services[0]!;
    setServiceId(nextService.id);
    setQuantity(optionsFor(nextService.id)[0]!);
  }

  function selectService(id: string) {
    const next = platform.services.find((s) => s.id === id)!;
    if (next.target !== service.target) setTarget("");
    setServiceId(id);
    setQuantity(optionsFor(next.id)[0]!);
  }

  async function applyVoucher() {
    if (!voucherInput.trim()) return;
    setPromoMessage(null);
    setIsChecking(true);
    try {
      const res = await checkVoucherFn({
        data: {
          platform: platformId,
          service: service.id,
          quality: qualityId,
          quantity: effectiveQuantity,
          code: voucherInput,
        },
      });
      if (res.ok) {
        setPromo({ kind: "voucher", code: res.code, rule: res.rule });
        setVoucherInput("");
      } else {
        setPromoMessage(res.error);
      }
    } catch {
      setPromoMessage("Gagal mengecek voucher. Coba lagi.");
    } finally {
      setIsChecking(false);
    }
  }

  async function claimNewMember() {
    setPromoMessage(null);
    setIsClaiming(true);
    try {
      const res = await checkNewMemberFn({ data: { whatsapp } });
      if (res.ok) setPromo({ kind: "new_member" });
      else setPromoMessage(res.error);
    } catch {
      setPromoMessage("Gagal klaim promo. Coba lagi.");
    } finally {
      setIsClaiming(false);
    }
  }

  async function submit() {
    setError(null);
    if (target.trim().length < 2) {
      setError(
        isProfile ? "Masukkan username atau link profil." : "Masukkan link postingan / video.",
      );
      return;
    }
    if (whatsapp.replace(/\D/g, "").length < 9) {
      setError("Masukkan nomor WhatsApp yang aktif.");
      return;
    }
    if (belowMinOrder) {
      setError("Subtotal belum memenuhi minimal order voucher. Hapus voucher atau tambah nominal.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await createOrderFn({
        data: {
          platform: platformId,
          service: service.id,
          quality: qualityId,
          quantity: effectiveQuantity,
          target,
          whatsapp,
          voucherCode: promo?.kind === "voucher" ? promo.code : undefined,
          newMember: promo?.kind === "new_member",
        },
      });
      if (res.ok) {
        setCreatedOrder(res.order);
        sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        setError(res.error);
      }
    } catch {
      setError("Gagal membuat pesanan. Coba lagi sebentar.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (createdOrder) {
    return (
      <section ref={sectionRef} id="order" className="scroll-mt-16 px-4 py-10">
        <PaymentView
          order={createdOrder}
          adminWhatsapp={adminWhatsapp}
          qrisImageSrc={qrisImageSrc}
          onNewOrder={() => {
            setCreatedOrder(null);
            setTarget("");
            setPromo(null);
            setVoucherInput("");
            setPromoMessage(null);
          }}
        />
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      id="order"
      aria-labelledby="order-title"
      className="scroll-mt-16 px-4 py-10"
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <div className="text-center">
          <h2 id="order-title" className="text-2xl font-extrabold tracking-tight md:text-3xl">
            Buat Pesanan
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pilih platform lalu isi data di bawah.
          </p>
        </div>

        <div role="radiogroup" aria-label="Pilih platform" className="grid grid-cols-4 gap-2">
          {PLATFORMS.map((p) => {
            const active = p.id === platformId;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => selectPlatform(p.id)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border bg-card p-3 text-xs font-semibold transition",
                  active ? "border-primary ring-2 ring-primary/30" : "hover:border-primary/40",
                )}
              >
                <img src={p.icon} alt="" width={28} height={28} className="size-7" />
                {p.name}
              </button>
            );
          })}
        </div>

        <StepCard step={1} title="Pilih Layanan">
          <div role="radiogroup" aria-label="Layanan" className="grid grid-cols-3 gap-2">
            {platform.services.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={s.id === service.id}
                onClick={() => selectService(s.id)}
                className={cn(
                  "rounded-lg border px-2 py-2.5 text-sm font-semibold transition",
                  s.id === service.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:border-primary/40",
                )}
              >
                {s.name}
              </button>
            ))}
          </div>
        </StepCard>

        <StepCard step={2} title="Masukkan Data Akun">
          <div className="mb-4 rounded-xl border border-primary/20 bg-accent/60 p-3 text-sm">
            <p className="mb-2 flex items-center gap-2 font-semibold text-accent-foreground">
              <Info className="size-4" aria-hidden="true" />
              Info pengisian data
            </p>
            <ul className="flex flex-col gap-2">
              <li
                className={cn(
                  "flex items-start gap-2 rounded-lg p-2",
                  isProfile
                    ? "bg-card font-semibold ring-1 ring-primary/30"
                    : "text-muted-foreground",
                )}
              >
                <UserRound className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  <strong>Followers</strong> diproses pakai <strong>username / link profil</strong>.
                </span>
              </li>
              <li
                className={cn(
                  "flex items-start gap-2 rounded-lg p-2",
                  !isProfile
                    ? "bg-card font-semibold ring-1 ring-primary/30"
                    : "text-muted-foreground",
                )}
              >
                <Link2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  <strong>Like, View, Repost, Share, Save</strong> diproses pakai{" "}
                  <strong>link postingan / link video</strong>.
                </span>
              </li>
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              Pastikan akun tidak di-private selama proses.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="target">
              {isProfile
                ? "Username / Link Profil"
                : `Link Postingan / Video (${platform.postLabel})`}
            </Label>
            <Input
              id="target"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={isProfile ? "@username atau https://..." : "https://..."}
              autoComplete="off"
              maxLength={300}
              className="h-11"
            />
          </div>
        </StepCard>

        <StepCard step={3} title="Pilih Kualitas">
          <div role="radiogroup" aria-label="Kualitas" className="flex flex-col gap-2">
            {QUALITIES.map((q) => {
              const active = q.id === qualityId;
              const price = priceFor(prices, service.id, q.id, 100);
              return (
                <button
                  key={q.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setQualityId(q.id)}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-xl border p-3 text-left transition",
                    active
                      ? "border-primary bg-accent/50 ring-2 ring-primary/30"
                      : "bg-background hover:border-primary/40",
                  )}
                >
                  <span className="flex flex-col">
                    <span className="font-bold">
                      {q.name}{" "}
                      <span className="font-medium text-muted-foreground">({q.origin})</span>
                    </span>
                    <span
                      className={cn(
                        "mt-1 w-fit rounded-full px-2 py-0.5 text-xs font-semibold",
                        q.id === "C"
                          ? "bg-success text-success-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {q.warranty}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-sm">
                    <span className="block font-bold text-primary">{formatRupiah(price)}</span>
                    <span className="text-xs text-muted-foreground">/100 {service.unit}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </StepCard>

        <StepCard step={4} title="Pilih Nominal">
          <div
            role="radiogroup"
            aria-label="Nominal"
            className="grid grid-cols-2 gap-2 sm:grid-cols-3"
          >
            {serviceNominals.map((n) => {
              const active = n === effectiveQuantity;
              return (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setQuantity(n)}
                  className={cn(
                    "flex flex-col rounded-lg border p-2.5 text-left transition",
                    active
                      ? "border-primary bg-accent/50 ring-2 ring-primary/30"
                      : "bg-background hover:border-primary/40",
                  )}
                >
                  <span className="text-sm font-bold">
                    {formatNumber(n)} {service.unit}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatRupiah(priceFor(prices, service.id, qualityId, n))}
                  </span>
                </button>
              );
            })}
          </div>
        </StepCard>

        <StepCard step={5} title="Pilih Pembayaran">
          <div className="flex items-center gap-3 rounded-xl border border-primary bg-accent/50 p-3 ring-2 ring-primary/30">
            <span className="flex size-10 items-center justify-center rounded-lg bg-card">
              <QrCode className="size-6 text-primary" aria-hidden="true" />
            </span>
            <span className="flex flex-col">
              <span className="font-bold">QRIS</span>
              <span className="text-xs text-muted-foreground">
                DANA, OVO, GoPay, ShopeePay, LinkAja & semua m-banking
              </span>
            </span>
          </div>
        </StepCard>

        <StepCard step={6} title="Nomor WhatsApp">
          <div className="flex flex-col gap-2">
            <Label htmlFor="whatsapp">Nomor WhatsApp aktif</Label>
            <Input
              id="whatsapp"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={whatsapp}
              onChange={(e) => {
                setWhatsapp(e.target.value);
                if (promo?.kind === "new_member") {
                  setPromo(null);
                  setPromoMessage("Nomor WhatsApp berubah, silakan klaim ulang promo New Member.");
                }
              }}
              placeholder="08xxxxxxxxxx"
              maxLength={20}
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">
              Dipakai admin untuk konfirmasi & update pesanan.
            </p>
          </div>
        </StepCard>

        <StepCard step={7} title="Kode Voucher" optional>
          {promo ? (
            <div
              className={cn(
                "flex items-center justify-between gap-3 rounded-xl border p-3",
                belowMinOrder ? "border-warning bg-warning/15" : "border-success/40 bg-success/10",
              )}
            >
              <span className="flex min-w-0 flex-col">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {promo.kind === "voucher" ? (
                    <TicketPercent className="size-4 shrink-0 text-success" aria-hidden="true" />
                  ) : (
                    <Gift className="size-4 shrink-0 text-promo" aria-hidden="true" />
                  )}
                  {promo.kind === "voucher" ? promo.code : `New Member ${NEW_MEMBER_PERCENT}%`}
                  {discount > 0 && <span>&middot; -{formatRupiah(discount)}</span>}
                </span>
                {belowMinOrder && promo.kind === "voucher" && (
                  <span className="mt-0.5 text-xs text-warning-foreground">
                    Minimal order {formatRupiah(promo.rule.minOrder)} — tambah nominal agar voucher
                    berlaku.
                  </span>
                )}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Hapus promo"
                onClick={() => {
                  setPromo(null);
                  setPromoMessage(null);
                }}
              >
                <X />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <Label htmlFor="voucher" className="sr-only">
                  Kode voucher
                </Label>
                <Input
                  id="voucher"
                  value={voucherInput}
                  onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      void applyVoucher();
                    }
                  }}
                  placeholder="Masukkan kode voucher"
                  maxLength={40}
                  className="h-11 uppercase"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 px-4"
                  disabled={!voucherInput.trim() || isChecking}
                  onClick={() => void applyVoucher()}
                >
                  {isChecking ? <Loader2 className="animate-spin" /> : "Pakai"}
                </Button>
              </div>

              <button
                type="button"
                onClick={() => void claimNewMember()}
                disabled={isClaiming}
                className="group flex items-center gap-3 rounded-xl border border-dashed border-promo/60 bg-promo/10 p-3 text-left transition hover:bg-promo/15 disabled:opacity-60"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-promo text-promo-foreground">
                  {isClaiming ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <Gift className="size-5" aria-hidden="true" />
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-bold">Klaim New Member {NEW_MEMBER_PERCENT}%</span>
                  <span className="text-xs text-muted-foreground">
                    Diskon {NEW_MEMBER_PERCENT}% untuk pesanan pertama nomor WhatsApp kamu.
                  </span>
                </span>
                <span className="shrink-0 rounded-lg bg-promo px-3 py-1.5 text-xs font-bold text-promo-foreground">
                  Klaim
                </span>
              </button>
            </div>
          )}
          {promoMessage && !promo && (
            <p role="status" className="mt-2 text-sm text-destructive">
              {promoMessage}
            </p>
          )}
        </StepCard>

        <div className="sticky bottom-3 z-30 rounded-2xl border bg-card/95 p-4 shadow-xl backdrop-blur">
          {error && (
            <p
              role="alert"
              className="mb-3 rounded-lg bg-destructive/10 p-2 text-sm font-medium text-destructive"
            >
              {error}
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-xs text-muted-foreground">
                {platform.name} {service.name} &middot; {formatNumber(effectiveQuantity)}
              </span>
              <span className="flex items-baseline gap-2">
                <span className="text-xl font-extrabold text-primary">{formatRupiah(total)}</span>
                {discount > 0 && (
                  <span className="text-xs text-muted-foreground line-through">
                    {formatRupiah(subtotal)}
                  </span>
                )}
              </span>
              <span className="text-[11px] text-muted-foreground">+ kode unik saat bayar</span>
            </div>
            <Button
              type="button"
              onClick={() => void submit()}
              disabled={isSubmitting}
              className="h-11 rounded-xl px-6 font-bold"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : null}
              Beli Sekarang
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
