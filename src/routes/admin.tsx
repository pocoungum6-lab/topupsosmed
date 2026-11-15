import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { AdminNav } from "@/components/admin/admin-nav";
import { getAdminStatus } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const status = await getAdminStatus();
    if (!status.loggedIn) throw redirect({ to: "/admin/login" });
  },
  head: () => ({
    meta: [
      { title: "Dashboard Admin - TopupSosmed" },
      {
        name: "description",
        content: "Kelola pesanan, voucher, harga dan pengaturan TopupSosmed.",
      },
      { property: "og:title", content: "Dashboard Admin - TopupSosmed" },
      {
        property: "og:description",
        content: "Kelola pesanan, voucher, harga dan pengaturan TopupSosmed.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="min-h-dvh bg-muted">
      <AdminNav />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
