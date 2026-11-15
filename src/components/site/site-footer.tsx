export function SiteFooter({ whatsapp }: { whatsapp: string }) {
  return (
    <footer className="border-t bg-card px-4 py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 text-sm text-muted-foreground md:flex-row">
        <p>&copy; {new Date().getFullYear()} TopupSosmed. Terpercaya sejak 2016.</p>
        {whatsapp && (
          <a
            href={`https://wa.me/${whatsapp}`}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary hover:underline"
          >
            Hubungi Admin via WhatsApp
          </a>
        )}
      </div>
    </footer>
  );
}
