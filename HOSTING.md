# Active hosting

The active deployment is Cloudflare Pages at `https://xirdavat-1001.pages.dev`.

This checkout (`1001-xirdavat-github`) is the current source. The older `vitrin` checkout and its Sites deployment are historical and must not be used as the default deployment target.

Deployment configuration is local-only at `pages/wrangler.json`. `npm run deploy` bundles the Worker and public assets, stages them under ignored `.sites-runtime/deploy`, and deploys to the Pages project from the local config. Runtime secrets are configured in Pages and are never copied into the bundle.

The latest release opens public browsing while protecting personal data and dashboards. Customer, seller and admin sessions are separate. To reach management, type `/admin` and sign in there; there is no public menu link.

Before schema changes, export an encrypted backup and inspect a recovery bookmark. Versioned migrations preserve existing identities, shops, products and orders. The release migration was validated on an exported copy before being applied to the live database; a full encrypted snapshot was also restored into a separate staging D1 database and table counts/foreign keys were checked.

The health workflow runs every 30 minutes when `SITE_URL` is configured as a GitHub Actions repository variable. GitHub controls workflow scheduling and failure notifications; a configured workflow is not a delivery guarantee for email/SMS alerts. See RELEASE-STATUS.md for integrations that still need operator accounts.
