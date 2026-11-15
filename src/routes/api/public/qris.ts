import { createFileRoute } from "@tanstack/react-router";

// Public QRIS image for the payment step. Read-only; serves the single uploaded file.
export const Route = createFileRoute("/api/public/qris")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from("qris").download("qris");
        if (error || !data) return new Response("Not found", { status: 404 });
        return new Response(data, {
          headers: {
            "Content-Type": data.type || "image/png",
            "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
          },
        });
      },
    },
  },
});
