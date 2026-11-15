import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ClipboardList, LogOut, Settings, Tags, TicketPercent, Zap } from "lucide-react";
import { adminLogout } from "@/lib/admin.functions";

const links = [
  { to: "/admin", label: "Pesanan", icon: ClipboardList, exact: true },
  { to: "/admin/vouchers", label: "Voucher", icon: TicketPercent, exact: false },
  { to: "/admin/prices", label: "Harga", icon: Tags, exact: false },
  { to: "/admin/settings", label: "Pengaturan", icon: Settings, exact: false },
] as const;

export function AdminNav() {
  const logout = useServerFn(adminLogout);
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-30 border-b bg-card">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
        <Link to="/" className="mr-2 flex items-center gap-2 font-extrabold">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Zap className="size-4" aria-hidden="true" />
          </span>
          <span className="hidden sm:inline">Admin</span>
        </Link>
        <nav aria-label="Menu admin" className="flex flex-1 items-center gap-1 overflow-x-auto">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.exact }}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground hover:bg-muted data-[status=active]:bg-accent data-[status=active]:text-accent-foreground"
            >
              <l.icon className="size-4" aria-hidden="true" />
              {l.label}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          onClick={async () => {
            await logout();
            await navigate({ to: "/admin/login" });
          }}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted"
        >
          <LogOut className="size-4" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Keluar</span>
        </button>
      </div>
    </header>
  );
}
