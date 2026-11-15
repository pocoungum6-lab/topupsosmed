<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- All database access goes through server functions using the service-role client; tables have RLS with no client policies (except public read on prices/settings) because shoppers are anonymous and admin uses a shared password.
- Admin auth is a single shared password (ADMIN_PASSWORD secret) with an HMAC-signed httpOnly cookie (`src/lib/admin-auth.server.ts`); why: carried over from the original app, no per-user accounts needed.
- Orders are placed via the `place_order` SQL function so voucher quota claims, the new-member check and the sequential unique payment code (`order_unique_code_seq`, added to `total`) are atomic.
- Nominal options per service are stored as JSON in the `settings` table (key `nominals`), parsed/validated by `parseNominalList` in `catalog.ts`; why: no schema change needed and server re-checks quantities against it.
- Prices live in `service_prices` (per service, per category A/B/C, per 100 units); `src/lib/catalog.ts` holds the catalog structure and promo constants shared by client and server.
- QRIS uploads go to the private `qris` storage bucket and are served by `/api/public/qris`; why: public buckets are blocked.
