# crafty-keep-sakes

Online shop and business website for hand crafted wedding keepsakes. Customers can browse and buy products, read the journal, and follow their orders. Admins run the shop, content and reporting from the same app.

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Local setup](#local-setup)
- [Scripts](#scripts)
- [Testing and CI](#testing-and-ci)
- [API overview](#api-overview)
- [Deployment](#deployment)
- [Database schema recovery](#database-schema-recovery)
- [Further documentation](#further-documentation)

## Features

### Everyone (signed out)

- **Home** with a hero, popular products, the latest journal posts and scrolling on-sale offers.
- **Shop**: browse products, view details and images, and see sale prices.
- **Journal (blog)**: read posts and see which are new.
- **Reviews**: customer feedback gathered from external sources, with a keyword search.
- **Register / sign in** (rate limited).

### Customers

- **Basket and checkout**: add items, then place an order. This creates an order and an invoice. With `PAYMENTS_PROVIDER` set, the customer is then sent to a hosted payment page and the invoice is marked paid automatically when the vendor's webhook confirms it (see [Payments](#payments)). Without it, no payment is taken online.
- **My invoices** (`/invoices`): invoice history with status, tracking and totals. Invoices changed since you last opened them are highlighted, and the five latest updates also appear on the home page.
- **Profile**: update account and delivery details.
- **Journal**: comment on posts and like or dislike them.
- **Notifications**: a bell in the header (refreshes every 60 seconds) for order, invoice and tracking updates.
- **Account menu** in the header: My profile, My invoices, Log out.

### Admins

All customer features, plus:

- **Admin Tools** (`/Admin`): manage products (create, update, images), users (create, update, delete), customer reviews (add, edit, remove), and view the audit log.
- **Invoices**: see every customer's invoices (`/Reporting/invoices`), update the invoice status and add tracking in a single "Save Changes" action. New orders are highlighted until you open them.
- **Reporting** (`/Reporting`):
  - **Dashboard** (`/Reporting/dashboard`): orders, revenue, units sold, customers and new accounts, with charts for a chosen date range (the last 30 days by default).
  - **Product sales**, **User activity** (including dormant accounts) and **Blog stats** reports, each with date filters, charts, pagination (10, 20, 50, 100 or All rows) and CSV export of the full filtered table.
- **Notifications**: new orders, new registrations, blog comments, account changes and published posts. A registration notification opens the new user's details in Admin tools; if the user was deleted, the page displays an error instead.
- **Audit trail**: write actions are recorded server-side.

### Roles

| Role | Access |
|---|---|
| Signed out | Home, Shop, Journal (read), Reviews, Sign in, Register |
| `customer` | The above, plus Basket, Profile, My invoices, Notifications, comments and reactions |
| `admin` | Everything, plus Admin Tools and Reporting |

Admin routes are protected in the client and enforced on the server (`requireRole('admin')`).

## Tech stack

- **Client**: React 19 (Create React App), TypeScript, Redux Toolkit, React Router, Grommet. Styling uses the design tokens in `client/src/helpers/theme.ts`.
- **Server**: Node.js, Express, TypeScript, MySQL (`mysql2`), JWT auth in an httpOnly cookie, bcrypt password hashing, AES-256 encryption of personal user fields, helmet and rate limiting.
- **Tests**: Jest (client with React Testing Library, server with supertest).

## Project structure

```
client/                  React app
  src/features/          One folder per feature (landingPage, products, basket, blog,
                         invoices, reviews, notifications, profile, admin_tools, reporting)
  src/store/             Redux slices and thunks
  src/api/               API paths and per-domain v1/v2 switches
  src/helpers/theme.ts   Design tokens
server/                  Express API
  src/routes/v2/         API routes (auth, products, users, basket, blog, notifications,
                         reviews, reports, audit)
  src/notifications/     Notification registry and service
  src/ts-common/         Database, auth middleware, helpers
  scripts/               Schema bootstrap, user and key tools, seeding
dev_docs/                Feature todo list and the retheme guide
docker-compose.nas.yml   NAS deployment (API and Cloudflare Tunnel)
```

## Local setup

This project has separate frontend (`client`) and backend (`server`) apps.

### 1) Create env files

- Backend: `cp server/.env.example server/.env`, then set your local database details and secrets.
- Frontend: create `client/.env` containing `REACT_APP_API_URL=http://localhost:3001` (there is no example file for the client).

Optional client flags `REACT_APP_API_<DOMAIN>_VERSION` (for example `REACT_APP_API_BLOG_VERSION`) choose between the legacy and v2 API for each area. They default to `v2`.

### 2) Install dependencies

- `cd client && npm install`
- `cd ../server && npm install`

### 3) Run backend and frontend

In one terminal:

- `cd server && npm run dev`

In another terminal:

- `cd client && npm start`

The frontend reads `REACT_APP_API_URL` from `client/.env` and should point to your backend URL (default: `http://localhost:3001`).

The schema must exist before the API will work, so run the bootstrap in [Database schema recovery](#database-schema-recovery) on a new database. To create your first admin, see [Create encrypted admin user](#create-encrypted-admin-user-manual-db-insert). Optional sample products: `cd server && npm run seed:products:v2`.

## Scripts

Run these from `client` or `server`.

| Where | Command | What it does |
|---|---|---|
| `client` | `npm start` | Dev server |
| `client` | `npm run build` | Production build |
| `client` | `npm run lint` | ESLint |
| `client` | `CI=true npm test -- --watchAll=false` | Run the tests once |
| `server` | `npm run dev` | API with auto-restart |
| `server` | `npm run build` / `npm start` | Compile, then run `dist/index.js` |
| `server` | `npm run lint` | ESLint |
| `server` | `npm test` | Run the tests |
| `server` | `npm run test:ci` | Tests with coverage and a per-domain coverage report |

Other server scripts (user creation, key generation and rotation, encrypted-data repair, product seeding) are covered in the sections below.

## Testing and CI

GitHub Actions (`.github/workflows/ci.yml`) runs on pull requests to, and pushes to, `main`. It runs four jobs: lint and test for the client, and lint and test for the server. Run the same commands locally before opening a pull request. Server tests mock the database, so they need no MySQL instance.

## API overview

All routes are under `/api/v2` and use the auth cookie. Unless noted, they need a signed-in user.

| Area | Base path | Notes |
|---|---|---|
| Auth | `/auth` | Login, register, `me`, logout, verify password, verify email, and resend verification, verify email, and resend verification. Login also records `last_login_at` and blocks unverified accounts and blocks unverified accounts |
| Products | `/products` | Public read, admin write, image upload |
| Users | `/users` | Profile access, admin management |
| Payments | `/payments` | `/webhook` (vendor, signature-verified), `/status/:invoiceId`, `/invoices/:id/pay` |
| Basket | `/basket` | Basket, checkout, `/orders` (own), `/orders/all` (admin), `/invoices/:id` |
| Blog | `/blog` | Posts, comments, reactions, NEW tracking |
| Notifications | `/notifications` | List and mark as read |
| Reviews | `/reviews` | Public read, admin write |
| Reports | `/reports` | Admin only: `overview`, `products`, `users`, `blog`, with `from` and `to` (`YYYY-MM-DD`) filters |
| Audit | `/audit` | Admin only |

Security notes: requests are limited to 100kb, login and registration are rate limited, CORS is limited to `CORS_ORIGIN` (defaults to `http://localhost:3000`).

## Deployment

The API is moving from a NAS to Railway. The full plan, status and cutover steps are in [dev_docs/RAILWAY_MIGRATION.md](dev_docs/RAILWAY_MIGRATION.md).

| Part | Where it runs |
| --- | --- |
| Client | Vercel (`main` is Production, the `dev` branch is `dev.craftykeepsakes.uk`) |
| API | Railway (`api-prd.craftykeepsakes.uk`) behind Cloudflare. The NAS is still the live API until cutover and stays as the fallback (`api-dev`) |
| Database | Railway MySQL (private network). The schema is applied on every deploy by `server/scripts/apply-schema.js` |
| Images | MinIO bucket on Railway, served from `files.craftykeepsakes.uk` |

- **Railway:** built from `server/Dockerfile` with `railway.json` (pre-deploy schema script, health check at `/health`). It deploys manually from `main`. Set `ORIGIN_SECRET` and a matching Cloudflare Transform Rule that adds the `X-Origin-Secret` header, so the API only accepts traffic that came through Cloudflare. `/health` and the Square webhook paths are exempt.
- **Environment:** see `server/.env.example` for the variables (database, `JWT_SECRET`, `CORS_ORIGIN`, `CLIENT_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `FRONTEND_URL`, `MINIO_*`, `ORIGIN_SECRET`, `SQUARE_*`). Keep the Resend key on the server only. `CORS_ORIGIN` takes a comma-separated list with no trailing slashes.
- **Verification links:** `FRONTEND_URL` is the backend's default link destination (local default: `http://localhost:3000`). On a shared backend, set `VERIFICATION_FRONTEND_ORIGINS` to a comma-separated list of trusted frontend origins, such as `https://dev.craftykeepsakes.uk,https://craftykeepsakes.uk`. Registration and resend use the request's `Origin` only when it exactly matches this list; otherwise they use `FRONTEND_URL`. Add those frontend origins to `CORS_ORIGIN` as well. Restart or redeploy the backend after changing variables. Origins can be supplied by non-browser clients, so only allow frontend deployments trusted to handle verification tokens.
- **Local development:** `npm run dev` uses `server/.env`. `npm run dev:railway` loads `server/.env.railway` (copy `server/.env.railway.example`) to test against Railway. The server refuses a non-local `DB_HOST` outside production unless `ALLOW_REMOTE_DB=1`.
- **Release flow:** build on a feature branch, merge it into `dev` to test on `dev.craftykeepsakes.uk` (a Preview build that calls Railway directly), then merge the feature branch into `main` by PR. Do not merge `dev` into `main`, and merge `main` back into `dev` afterwards. The login cookie is `SameSite=Strict`, so test sites must sit under `craftykeepsakes.uk`, not `*.vercel.app`.
- **NAS (until cutover):** the API runs as a Docker image behind a Cloudflare Tunnel (`docker-compose.nas.yml`, whose header lists the build, push and `docker compose up` commands). It needs the database settings, `JWT_SECRET`, `CORS_ORIGIN` and `TUNNEL_TOKEN`.

## Database schema recovery

Apply or restore the v2 schema using the configured backend environment:

- `cd server && npm run db:apply-schema`

The bootstrap creates every v2 table (users and roles, products, baskets, orders, invoices and payments, notifications, blog, reviews, audit, and the view-tracking tables that drive NEW and Updated highlights). It also applies the email-verification column and token-table upgrades idempotently and marks admin-role accounts verified. Other existing-table changes still need to be migrated explicitly. The Railway pre-deploy runs this same script.

## Create an admin user (manual DB insert)

From `server`, generate a ready-to-paste SQL script for the v2 tables:

- `npm run user:generate-insert -- --email admin@example.com --password ChangeMe123! --firstName Admin --lastName User --role admin`

The command prints three SQL statements (`users_v2`, `user_roles_v2`, `customer_profiles_v2`) with no session variables. Run them in order in MySQL.

Notes:

- The password is bcrypt-hashed.
- Change the password immediately after first login if you use a temporary value.

## Payments

Payments sit behind a provider interface in `server/src/payments/`. Checkout creates a pending order and an unpaid invoice, asks the provider for a hosted payment link, and redirects the customer to it. The provider calls `POST /api/v2/payments/webhook`; the server verifies its signature, records the event once in `payments_v2`, checks the amount matches the invoice, then marks the invoice paid, confirms the order and notifies the customer and admins. Failed or abandoned payments leave the invoice unpaid, and the customer can retry from the payment result page.

| `PAYMENTS_PROVIDER` | Behaviour |
| --- | --- |
| empty | Payments off. Checkout only creates an unpaid invoice (the original behaviour). |
| `mock` | Local testing. The "payment page" is a simulated screen at `/payments/mock` with success and failure buttons. Refused when `NODE_ENV=production`. |
| `square` | Square hosted checkout (Payment Links). Needs the `SQUARE_*` values in `server/.env.example`. Use `SQUARE_ENVIRONMENT=sandbox` with sandbox credentials until going live. |

**Square environments.** Sandbox and production use separate credentials (`SQUARE_SANDBOX_*` and `SQUARE_PRODUCTION_*`: access token, location ID and webhook signature key), so a sandbox token can never be sent to the live host. The unprefixed `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID` and `SQUARE_WEBHOOK_SIGNATURE_KEY` still work for the sandbox.
- Locally, and anywhere `NODE_ENV` is not `production`, only the sandbox is used. `SQUARE_ENVIRONMENT=production` is refused with an error, so a development machine cannot take real payments.
- In production the sandbox stays active until `SQUARE_ENVIRONMENT=production` is set.

**Going live:**
1. In Square, create a production application and note its access token and location ID.
2. Create a production webhook subscription for `payment.updated` at `SQUARE_WEBHOOK_URL` and copy its signature key.
3. On the host running the API (Railway, or the NAS), set the three `SQUARE_PRODUCTION_*` values, `SQUARE_ENVIRONMENT=production` and `NODE_ENV=production`, then restart or redeploy the API. Make one small real payment and one real declined card to check it, and refund the payment from the Square dashboard.

The webhook URL must match the subscription exactly. Square sends customers back to `CLIENT_URL/payments/result` after paying.

Set `CLIENT_URL` to the storefront's public URL so payment redirects return to the right place.

## Further documentation

- `dev_docs/FEATURE_TODOS.md`: the feature, enhancement and bug backlog, with user stories.
- `dev_docs/RETHEME.md`: the visual design principles and tokens. Use the `ui` tokens rather than hard-coded colours.
