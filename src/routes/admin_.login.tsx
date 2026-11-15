import { useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminLogin, getAdminStatus } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin_/login")({
  beforeLoad: async () => {
    const status = await getAdminStatus();
    if (status.loggedIn) throw redirect({ to: "/admin" });
    return { configured: status.configured };
  },
  head: () => ({
    meta: [
      { title: "Login Admin - TopupSosmed" },
      { name: "description", content: "Masuk ke dashboard admin TopupSosmed." },
      { property: "og:title", content: "Login Admin - TopupSosmed" },
      { property: "og:description", content: "Masuk ke dashboard admin TopupSosmed." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const { configured } = Route.useRouteContext();
  const login = useServerFn(adminLogin);
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-extrabold">Admin TopupSosmed</h1>
        <p className="mt-1 text-sm text-muted-foreground">Masuk untuk mengelola pesanan.</p>
        {!configured && (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-warning/30 p-3 text-sm text-warning-foreground"
          >
            Password admin belum diatur. Minta developer mengisi password admin di pengaturan
            rahasia.
          </p>
        )}
        <form
          className="mt-5 flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            setMessage(null);
            try {
              const res = await login({ data: { password } });
              if (res.ok) await navigate({ to: "/admin" });
              else setMessage(res.message);
            } catch {
              setMessage("Gagal masuk. Coba lagi.");
            } finally {
              setPending(false);
            }
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10"
            />
          </div>
          {message && (
            <p role="alert" className="text-sm text-destructive">
              {message}
            </p>
          )}
          <Button type="submit" disabled={pending} className="h-10">
            {pending && <Loader2 className="animate-spin" />}
            Masuk
          </Button>
        </form>
      </div>
    </main>
  );
}
