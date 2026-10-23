# Shared API for web and future apps

The current API accepts same-origin session cookies. Android apps are not implemented in this release; before shipping them, add an explicit mobile token/OAuth flow rather than weakening origin checks or exposing session secrets in a WebView.

Use `x-app-audience: buyer|seller|admin` to select an existing authenticated session. This is only a selector: each cookie is checked against its audience and current database permissions. Supplying a header without its matching valid cookie grants no access.

| Area | Endpoints |
| --- | --- |
| Public | `GET /api/bootstrap`, `/api/product-info/:id`, `/api/media/:id` for approved public references |
| Identity | `POST /api/auth/register`, `/login`, `/logout`, `/forgot`, `/reset`, `/verify-email`, `/change-password` |
| Customer | `/api/profile`, `/addresses`, `/cart`, `/favorites`, `/checkout`, `/orders`, `/notifications` |
| Sellers | `/api/stores`, `/products`, `/products/bulk`, `/seller-tools`, `/suborders/:id`, `/questions/:id` |
| Trust | `/api/reviews`, `/questions`, `/reports`, `/tickets` |
| Staff | `/api/admin`, `/admin/orders`, `/admin/permissions`, `/admin/users/:id`, `/admin/stores/:id`, `/admin/products/:id`, `/admin/reports/:id`, `/admin/reviews/:id`, `/admin/health` |

Registration accepts only buyer or seller account types. Roles and store permissions cannot be self-assigned. Customer data is scoped by authenticated ID; seller/moderator order views contain only the stores they are authorized to manage. Price/stock and totals are always calculated on the server.
