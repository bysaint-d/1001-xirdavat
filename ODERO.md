# Odero integration preparation

Status: server adapter implemented and tested offline. It is **not wired into checkout, deployed, or activated for real payments**. The current checkout still uses its existing test simulation.

## Provider documentation

- [Hosted payment page](https://developer.oderopay.com.tr/az/api/checkout)
- [Authentication and API conventions](https://developer.oderopay.com.tr/az/api)
- [Marketplace and seller payouts](https://developer.oderopay.com.tr/az/marketplace)
- [Official SDK signature reference](https://github.com/TokenPayEng/tokenpay-php-client/blob/master/lib/Tokenpay/Util/AuthSignatureGenerator.php)

`lib/odero.mjs` initializes hosted checkout, signs server requests and verifies a payment using the authenticated provider API. Verification checks payment status, amount, currency and checkout identifier. It does not trust browser callback parameters as evidence of payment. The adapter sends no card fields; the hosted provider page collects them.

## Required account setup

Create an Azerbaijan sandbox merchant account at https://sbx-merchant.odero.az. Obtain the API key and secret key from the merchant profile. Sandbox and live credentials are different. Confirm with Odero that marketplace/sub-merchant settlement is enabled for this account before implementing seller payouts.

Set `ODERO_API_KEY` and `ODERO_SECRET_KEY` as Cloudflare Pages runtime secrets. Set `ODERO_ENV` to `sandbox` initially; `live` selects the Azerbaijan production gateway. Never put these values in `public/`, Git, issue comments or chat.

Each seller needs a verified Odero sub-merchant ID and an agreed payout percentage. The adapter requires an explicit `subMerchants` mapping from trusted server configuration. It does not assume a commission. Seller payout values are rounded down to qepik. Shipping is a separate platform item; confirm its treatment with Odero and the merchant before activation.

## Remaining checkout work before activation

1. Confirm the merchant account, seller onboarding and commission model with the owner.
2. Reserve stock atomically before initializing payment; retain pending-payment orders outside the seller's actionable queue. The current test flow reserves stock only when completing an order and cannot be reused unchanged for real charges.
3. Persist the provider token against the buyer, server-calculated amount and checkout session. Never accept a token-to-session mapping supplied by the browser.
4. Add an unauthenticated, size-limited callback endpoint before the login middleware. The provider posts `token` as form data. Resolve the persisted mapping and query Odero server-to-server; callback delivery can occur without the buyer's session cookie.
5. Commit successful payment and order confirmation idempotently. Disable the current arbitrary-input `/complete` test endpoint when real payments are enabled. Mark failures and uncertain outcomes separately; do not retry initialization automatically after timeouts.
6. Implement abandoned-payment reconciliation and stock release after checking the provider's final state. A late success must not create an unfulfillable paid order.
7. Add refund and settlement workflows for seller rejection, cancellation and returns. A local order cancellation is not a bank refund. Do not release seller funds merely because a browser reports success.
8. Run actual sandbox end-to-end tests for success, 3DS failure, timeout, duplicate callback, late callback and stock contention. Verify the real hosted-payment hostname against the adapter allowlist. Activate live credentials only after these tests pass.

## Local verification

```sh
node scripts/test-odero.mjs
```

These tests use the official SDK's known signature answers and fake provider responses. They do not demonstrate a completed sandbox or live payment.
