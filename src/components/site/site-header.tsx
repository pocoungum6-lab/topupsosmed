import { Link } from "@tanstack/react-router";
import { Zap } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-extrabold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="size-4" aria-hidden="true" />
          </span>
          <span>
            Topup<span className="text-primary">Sosmed</span>
          </span>
        </Link>
        <nav aria-label="Navigasi utama" className="flex items-center gap-1 text-sm font-medium">
          <a href="#order" className="rounded-md px-3 py-2 hover:bg-muted">
            Order
          </a>
          <a href="#faq" className="hidden rounded-md px-3 py-2 hover:bg-muted sm:inline-block">
            FAQ
          </a>
        </nav>
      </div>
    </header>
  );
}
