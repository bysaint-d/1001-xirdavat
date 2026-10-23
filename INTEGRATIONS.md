# Email, cargo and public catalog

## Brevo setup (no secret in GitHub or chat)

1. Owner creates a free Brevo account and completes its account/sender verification. The free plan currently permits 300 sends/day, including transactional mail. Check [current provider limits](https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans).
2. In Brevo, verify a sender email and enable transactional sending. Create a suitable API key yourself. A verified owned domain is recommended for deliverability; a Cloudflare `pages.dev` hostname is not an owned sender domain.
3. Sign into `/admin`, open **Email xidməti**, enter the verified sender and API key, and save. The server checks Brevo's official `/v3/senders` endpoint and rejects an inactive/unverified sender. Saving does not send a test message or assert inbox delivery.
4. Credentials are AES-GCM encrypted in `system_settings.email_credentials` using an application-specific key derived from the existing runtime `AUTH_PEPPER`. They are never returned by the API or included in audit details. Preserve AUTH_PEPPER separately when migrating the database. Authorized admin sessions and that runtime secret remain security boundaries.
5. Alternatively set runtime-only `EMAIL_PROVIDER=brevo`, `EMAIL_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME`; existing Resend runtime configuration remains supported. Environment credentials take precedence over DB configuration.
6. Signup verification, password reset and order notifications use the outbox. Auth dispatch is attempted immediately; successful API mutations dispatch via `waitUntil`. The existing half-hour external health check triggers another retry opportunity. This is request-driven dispatch, not a guaranteed cron SLA. Admin can also dispatch from **Sistem**.
7. Sender API acceptance is `sent`, not recipient delivery. Failed sends use exponential delay, a claim lease and a five-attempt cap. Recipient spam filtering and account quotas are outside the app's control. No deliverability webhook is claimed. API keys/sender verification and actual provider delivery must be checked before announcing live email support.

API contracts: [send transactional email](https://developers.brevo.com/reference/send-transac-email), [verified senders](https://developers.brevo.com/reference/get-senders).

## Cargo status

Implemented: store-scoped CSV export (buyer data is private), selectable carrier, persisted tracking code, NCM official tracking link and Qapıda site link, seller order stages and buyer notification. CSV marks the payment mode, including test orders; never submit a test order to a real courier.

**Not connected:** automatic booking, paid labels, pickup calls or carrier webhooks. No shipment is created remotely and no buyer address is sent to a carrier automatically. A real carrier business account, service contract and documented API credentials are required. NCM's public website advertises an API but its linked `/swagger` returned 404 on 2026-10-23; an API contract has not been guessed. The CSV is the platform's neutral export, not a claim of a carrier-specific import format.

## Catalog of 100 products

`lib/catalog-data.json` contains exactly 100 unique source-attributed public product facts, captured from Birmarket's plain category/product pages. It contains product names, brand, model/SKU, snapshot price and source image links/date, not customer data, reviews or copied long descriptions. The import is bounded, honors the public robots route exclusions, and does not use account/search/private APIs.

Run `node scripts/load-public-catalog.mjs CONFIG_PATH EXISTING_APPROVED_STORE_ID` **after an encrypted backup and migration**. The default existing store is `demo-store`. Inserts are idempotent and never overwrite existing product stock, prices or order references. The 96 newly added records start with stock zero and are marked `inventoryVerified:false`; sellers must provide actual inventory before sales. Existing four test records and previous orders remain intact. This is not a Birmarket partnership, live inventory feed or authorization to resell products. External image availability and source prices may change.

`node scripts/import-public-catalog.mjs` is the bounded research importer; do not run it as a scheduled production sync. Seller stock updates remain the authority for checkout.

## Business pages

Public routes: `/about`, `/contact`, `/how-it-works`, `/sell`, `/delivery`, `/returns`, `/terms`, `/privacy`, `/seller-rules`, `/faq`. Admin can edit the operator's brand/contact/legal fields in **Biznes məlumatları**. Only the brand and phone were supplied; address, tax ID, legal name, email and opening hours are blank. Do not invent them or advertise legal launch readiness.

Anonymous contact requests require privacy consent and a reply channel; same-origin checks, a honeypot, body limits and per-IP hashed rate limits apply. Only admins can access the contact inbox. Closing a message marks it reviewed; it does not claim that an email reply was sent.

Policies describe the current test service. Consumer rights remain applicable regardless of the panel's technical return window. Primary references: [Electronic Commerce Law](https://e-qanun.az/framework/10406), [consumer authority FAQ](https://competition.gov.az/az/page/muraciet/tez-tez-verilen-suallar). The operator must supply its complete business information and review commercial terms before real sales.
