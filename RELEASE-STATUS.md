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

- Email delivery: configure a verified sender and `EMAIL_API_KEY` / `EMAIL_FROM` for Resend, or replace the sender adapter. Until configured, password recovery clearly reports unavailable and admin invitations remain available. Verification is not silently claimed.
- Automated cargo labels/status: select a logistics provider and configure its API. Manual tracking/order transitions work; automatic courier updates are not fabricated.
- Independent backup/export scheduling, retention policy, external alert receiver and load/penetration testing require operator setup. Cloudflare's own D1 Time Travel does not replace a tested cross-provider export schedule.
- Production product inventory and legal business information must be provided by the owner/sellers. Existing source-labelled samples are not official Birmarket inventory synchronization.
- Payment integration is intentionally paused. The current checkout remains a labelled test; the Odero adapter is not activated.

Android apps have not been created. Shared JSON API and identity/scoping boundaries are documented in API.md for subsequent mobile clients.
