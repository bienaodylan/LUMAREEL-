# LUMARÉEL production go-live checklist

Last audited: 2026-11-23

## Connected infrastructure

- GitHub: `bienaodylan/LUMAREEL-`, default branch `main`.
- Vercel: project `lumareel`, framework Vite, production deployment currently READY.
- Supabase: project ref `jwimueyxtbkiwwpidabj`, healthy, URL `https://jwimueyxtbkiwwpidabj.supabase.co`.
- Existing Supabase tables: events, orders, tickets, users, membership tables, scanner tables, settings, emails, archives and organizers.
- Existing database migrations are present and have been applied; do not recreate the Supabase project.

## Current blockers (must be resolved before live payments)

- Vercel's Supabase service-role/server secret is not configured.
- PayMeTrust live API key, secret, merchant ID and webhook secret are not configured.
- Resend API key and verified sending domain are not configured.
- Vercel deployment protection currently applies to Vercel domains (SSO protection); a verified custom domain/public-access configuration is needed for public launch.
- The application still contains disk/in-memory persistence paths in `src/server/db.ts`. Vercel serverless filesystems are ephemeral; production records must be persisted through Supabase.
- Production readiness must be verified against real routes, database writes, payment callbacks, ticket issuance, scanner authorization and email delivery before switching payment provider to live.

## Vercel environment variables

Set these in the Vercel project, Production and Preview targets as appropriate. Never place server secrets in `VITE_*` or `NEXT_PUBLIC_*` variables.

### Public Supabase configuration

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Server-only Supabase configuration

- `SUPABASE_SERVICE_ROLE_KEY` (legacy service-role key, if required by the server code)
- `SUPABASE_SECRET_KEY` (new secret-key format, only if server code is updated to support it)

### PayMeTrust

- `PAYMETRUST_ENV` — keep `sandbox` until live credentials and end-to-end tests are completed
- `PAYMETRUST_API_KEY`
- `PAYMETRUST_SECRET_KEY`
- `PAYMETRUST_MERCHANT_ID`
- `PAYMETRUST_WEBHOOK_SECRET`
- `PAYMETRUST_BASE_URL`

### Resend

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` — use a sender on a verified domain

### Application

- `APP_PUBLIC_URL` — final public URL, not a protected preview URL
- `ADMIN_API_KEY` — generate a strong random value only if the code path uses it; prefer Supabase-authenticated role checks

## Release gates

1. Confirm Supabase public keys work in frontend and server auth.
2. Configure the server-only Supabase credential and verify privileged writes.
3. Remove production fallbacks that return success without persistence.
4. Migrate event, order, ticket, scanner, archive, news, organizer and platform-setting persistence to Supabase.
5. Verify RLS and RPC authorization with customer, box-office and super-admin accounts.
6. Test order creation, payment initiation, signed webhook, idempotent payment confirmation, ticket/card issuance and refunds/cancellations.
7. Test scanner token expiry/revocation and duplicate scans.
8. Test Resend confirmation, transfer, card activation and failure handling.
9. Configure public domain and deployment protection.
10. Run lint, build, tests and a production smoke-test suite; deploy only after all gates pass.
