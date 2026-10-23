# Marketplace release

Implemented in source:

- Public catalog, store/product detail, filters and guest basket. Account required for checkout, personal data and management only.
- Separate customer and seller login/registration, with independent HttpOnly Secure session cookies. `/admin` uses its own login and cookie; public navigation contains no admin link. A guessed admin URL never grants permission.
- Founder allowlist, scoped moderator permissions (catalog, order management, store information, product approval), owner protection, immediate session revocation and audit trail.
- Admin overview of stores, ownership/status updates, product editing/moderation, user suspension, permissions, invitations, tickets, private documents, reviews, reports and service diagnostics.
- Branding (logo/cover), hours, delivery information, shipping fees, social links, structured product fields, CSV import/export, atomic bulk price/stock changes and low-stock overview.
- Profiles, saved addresses, password change, verification/reset token flows, notification inbox and email outbox. Delivered-purchase reviews, product questions/answers and reporting.
- Product SEO metadata/structured data, sitemap, robots rules, private-page noindex and security headers.
- Versioned full-schema migration, typed encrypted database transfer (including files and identities), integrity and recovery tests. See DATABASE.md.

External configuration still required:

- Email delivery: the Brevo adapter and admin setup form are implemented. The owner must verify a Brevo account/sender and enter its API key in the protected admin form. Runtime-only Resend configuration is also supported. No real email delivery has been verified yet. See INTEGRATIONS.md.
- Cargo: carrier selection, store-scoped CSV export, NCM tracking link and manual order transitions work. Automatic booking, labels and webhooks still require a carrier business account and documented API contract. No courier API is claimed as connected.
- Independent backup/export scheduling, retention policy, external alert receiver and load/penetration testing require operator setup. Cloudflare's own D1 Time Travel does not replace a tested cross-provider export schedule.
- Catalog now contains 100 source-attributed product facts. New imports have zero stock until a seller confirms inventory. Existing four test products/stock/order references are preserved. This is not official Birmarket inventory synchronization.
- Ten public information pages and private admin contact inbox are implemented. Brand and phone are supplied; the operator's legal name, VÖEN, address and email are still missing. Business information can be edited in admin.
- Payment integration is intentionally paused. The current checkout remains a labelled test; the Odero adapter is not activated.

Android apps have not been created. Shared JSON API and identity/scoping boundaries are documented in API.md for subsequent mobile clients.
