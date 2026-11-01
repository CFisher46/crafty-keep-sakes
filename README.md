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
- **Notifications**: new orders, new registrations, blog comments, account changes and published posts.
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

If you have existing encrypted user records from an older key, set `ENCRYPTION_KEY_PREVIOUS` in `server/.env` so the backend can still decrypt legacy rows while using the new `ENCRYPTION_KEY` for future writes.

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
| Auth | `/auth` | Login, register, `me`, logout, verify password. Login also records `last_login_at` |
| Products | `/products` | Public read, admin write, image upload |
| Users | `/users` | Profile access, admin management |
| Payments | `/payments` | `/webhook` (vendor, signature-verified), `/status/:invoiceId`, `/invoices/:id/pay` |
| Basket | `/basket` | Basket, checkout, `/orders` (own), `/orders/all` (admin), `/invoices/:id` |
| Blog | `/blog` | Posts, comments, reactions, NEW tracking |
| Notifications | `/notifications` | List and mark as read |
| Reviews | `/reviews` | Public read, admin write |
| Reports | `/reports` | Admin only: `overview`, `products`, `users`, `blog`, with `from` and `to` (`YYYY-MM-DD`) filters |
| Audit | `/audit` | Admin only |

Security notes: requests are limited to 100kb, login and registration are rate limited, CORS is limited to `CORS_ORIGIN` (defaults to `http://localhost:3000`), and personal user fields are encrypted at rest.

## Deployment

The API runs as a Docker image (`server/Dockerfile`) on a NAS, reachable only through a Cloudflare Tunnel (`docker-compose.nas.yml`). The compose file's header lists the build, push and `docker compose up` commands. Required environment values are the database settings, `ENCRYPTION_KEY`, `JWT_SECRET`, `CORS_ORIGIN` and `TUNNEL_TOKEN`. Product images are kept in a persistent volume.

## Database schema recovery

Reset or restore the v2 schema by running the bootstrap script from the project root:

- `mysql -u <user> -p <database> < server/scripts/migrations/phase1_schema_v2.sql`

The bootstrap is a single script that creates every v2 table (users and roles, products, baskets, orders, invoices and payments, notifications, blog, reviews, audit, and the view-tracking tables that drive NEW and Updated highlights). It uses `CREATE TABLE IF NOT EXISTS`, so it is safe to re-run, but it does not alter tables that already exist. When a new column or table is added, the script is updated and existing databases need that change applied by hand.

## Encrypted user data recovery

If old encrypted user fields can no longer be decrypted (lost historical key), run the server repair script.

From the `server` directory:

- `npm run repair:encrypted-users` (dry run)
- `npm run repair:encrypted-users:apply` (persists changes)

The script only clears undecryptable encrypted fields (`first_name`, `last_name`, address lines, telephone). Users can then re-enter those values and they will be encrypted with the current key.

## Create encrypted admin user (manual DB insert)

From `server`, generate a ready-to-paste SQL `INSERT` using the current `ENCRYPTION_KEY`:

- `npm run user:generate-insert -- --email admin@example.com --password ChangeMe123! --firstName Admin --lastName User --address1 "HQ" --town "London" --county "Greater London" --postcode "SW1A 1AA" --telephone "07123456789" --type admin --status active`

The command prints one SQL statement. Copy that statement and run it in MySQL.

If you want defaults for most fields, only email and password are required:

- `npm run user:generate-insert -- --email admin@example.com --password ChangeMe123!`

Notes:

- The generated `password` is bcrypt-hashed.
- `first_name`, `last_name`, address lines, and `telephone_number` are encrypted with your current key.
- Change the password immediately after first login if you use a temporary value.

## Encryption key runbook

### Generate a new key

From `server`:

- `npm run key:generate`

Copy the emitted key into `ENCRYPTION_KEY` in `server/.env`.

### Rotation process

1. Put the current key in `ENCRYPTION_KEY_PREVIOUS`.
2. Put the new key in `ENCRYPTION_KEY`.
3. Restart backend.
4. As users update records, new writes use the new key while old values still decrypt through `ENCRYPTION_KEY_PREVIOUS`.
5. After all old data is re-written, remove `ENCRYPTION_KEY_PREVIOUS`.

### Backup policy

- Store `ENCRYPTION_KEY` and `ENCRYPTION_KEY_PREVIOUS` in a password manager or secret manager (not only local `.env`).
- Keep at least two backups in separate secure locations.
- Record fingerprints with `npm run key:fingerprints` and store them with release notes to verify the intended keys are loaded.

## Payments

Payments sit behind a provider interface in `server/src/payments/`. Checkout creates a pending order and an unpaid invoice, asks the provider for a hosted payment link, and redirects the customer to it. The provider calls `POST /api/v2/payments/webhook`; the server verifies its signature, records the event once in `payments_v2`, checks the amount matches the invoice, then marks the invoice paid, confirms the order and notifies the customer and admins. Failed or abandoned payments leave the invoice unpaid, and the customer can retry from the payment result page.

| `PAYMENTS_PROVIDER` | Behaviour |
| --- | --- |
| empty | Payments off. Checkout only creates an unpaid invoice (the original behaviour). |
| `mock` | Local testing. The "payment page" is a simulated screen at `/payments/mock` with success and failure buttons. Refused when `NODE_ENV=production`. |
| `square` | Square hosted checkout. Not built yet; needs the `SQUARE_*` values in `server/.env.example`. |

Set `CLIENT_URL` to the storefront's public URL so payment redirects return to the right place.

## Further documentation

- `dev_docs/FEATURE_TODOS.md`: the feature, enhancement and bug backlog, with user stories.
- `dev_docs/RETHEME.md`: the visual design principles and tokens. Use the `ui` tokens rather than hard-coded colours.
