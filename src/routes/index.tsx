import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site/site-header";
import { Hero } from "@/components/site/hero";
import { OrderForm } from "@/components/site/order-form";
import { Features } from "@/components/site/features";
import { Faq } from "@/components/site/faq";
import { SiteFooter } from "@/components/site/site-footer";
import { OrderNotification } from "@/components/site/order-notification";
import { getStorefront } from "@/lib/shop.functions";

const storefrontQuery = queryOptions({
  queryKey: ["storefront"],
  queryFn: () => getStorefront(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TopupSosmed - Topup Sosmed Terpercaya Sejak 2016" },
      {
        name: "description",
        content:
          "Tambah followers, likes, views, repost, share & save Instagram, TikTok, Facebook, Shopee. Proses cepat, tanpa password, bayar QRIS.",
      },
      { property: "og:title", content: "TopupSosmed - Topup Sosmed Terpercaya Sejak 2016" },
      {
        property: "og:description",
        content:
          "Followers, like & view Instagram, TikTok, Facebook, Shopee. Cepat, tanpa password, bayar QRIS.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(storefrontQuery),
  component: Index,
});

function Index() {
  const { data } = useSuspenseQuery(storefrontQuery);
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <OrderForm
          prices={data.prices}
          nominals={data.nominals}
          adminWhatsapp={data.whatsapp}
          qrisImageSrc={data.qrisImageSrc}
        />
        <Features />
        <Faq />
      </main>
      <SiteFooter whatsapp={data.whatsapp} />
      <OrderNotification nominals={data.nominals} />
    </>
  );
}
