# LUMARÉEL — Payment flow and integration review

Audit date: 2026-11-23

## Current implementation findings

- Checkout UI offers Wave, Orange Money, MTN MoMo, Moov Money, Djamo and card.
- Current PayMeTrust service maps Wave -> WAVE_CI, Orange -> OM_CI, MTN -> MOMO_CI, Moov -> FLOOZ_CI, and Djamo/card -> CARD.
- Public channel config does not list Djamo separately; it only exposes card. Confirm support and correct this before enabling Djamo.
- The service currently authenticates using api_key/api_password at /oauth/login and initiates via /payments/init. Current PayMeTrust public docs describe /v1/oauth/login and POST /v1/payment. Verify the merchant's API version and request/response contract before live use.
- Transaction records/cache are stored on local disk in src/server/paymetrustService.ts. This is not durable on Vercel serverless and must move to Supabase.
- Phone validation only checks digit length (8–15), not country/operator compatibility. Normalize E.164 and validate country-specific formats for methods requiring phone.
- Do not collect card number/CVV in LUMARÉEL if hosted checkout is used. Card data must stay on the payment provider's secure page.

## Recommended user flow

1. Create the order server-side from authoritative prices and inventory.
2. Create a Supabase payment-attempt record with unique idempotency/reference.
3. Initiate PayMeTrust server-side; never expose API credentials.
4. If a hosted URL is returned, open it in the system browser on mobile (not an embedded webview) and retain pending state in LUMARÉEL.
5. For Wave/app wallets, show an explicit Open app / Complete payment action and a Check status action; use provider-supplied URL only.
6. For push/USSD/OTP, show provider-returned instructions and allow status retry. Never ask for wallet PINs in LUMARÉEL.
7. Treat webhook as primary confirmation and verify documented notify_token/transaction status. Do not trust redirect parameters or a client-side success button.
8. Make webhook handling idempotent; atomically mark payment paid, decrement inventory, issue tickets/cards, and queue email exactly once.
9. Poll status only as fallback, with backoff and bounded expiry.
10. Provide pending, success, failed, cancelled, expired, and retry states.

## Provider UX assumptions (Côte d'Ivoire; confirm PayMeTrust channel behavior)

- Wave: external checkout URL; mobile browser/app handoff, desktop QR/link where supported. Keep LUMARÉEL pending until server confirmation.
- Orange Money: OTP or operator confirmation depending on aggregator/API. If direct flow requires OTP, collect only the OTP requested by provider and send it server-side; never collect wallet PIN.
- MTN MoMo: commonly push/USSD confirmation on payer's phone; show instructions and pending state.
- Moov Money: push/USSD or hosted redirect depending on aggregator. Follow response, not a hardcoded assumption.
- Djamo: wallet-app/hosted-link flow, not SIM/USSD. Confirm dedicated PayMeTrust channel before exposing it. Current code maps Djamo to CARD, unverified.

## Environment variable template

See .env.example. Secrets must be server-only, encrypted in Vercel, and scoped intentionally. Do not create fake production credentials or switch PAYMETRUST_ENV to production before live credentials are added.

## Credentials not confirmed by public PayMeTrust docs

Public PayMeTrust docs currently describe API key + API password OAuth, payment initiation, payment URL, notify URL, and notify_token validation. An RSA key is not documented in the public flow reviewed. Ask PayMeTrust support to confirm whether an RSA key is required, whether it is a merchant private key or provider public key, exact format, and variable name before adding it to the application.
