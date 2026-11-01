# Railway Migration

Steps and findings for moving the API and MySQL database from the NAS to Railway.

## Priority 1: remove all dependencies on legacy tables (done)
Before migrating, the server must only use the `_v2` tables. This was done in this PR:

- **Login and verify-password** (`server/src/routes/v2/auth.ts`): removed the fallback to the old `users` table and the `AUTH_SOURCE` setting. Unknown emails now return 401 instead of 500.
- **Product queries** (`server/src/ts-common/product-queries.ts`): removed the `legacy` read source and the unused `createProductQuery` / `updateProductQuery`, which wrote to the old `products` table. Product reads use `products_v2` and `product_images_v2` only.
- **Encryption**: the AES helpers (`ts-common/helpers.ts`) only existed to read the old encrypted `users` rows, so they, `ENCRYPTION_KEY` and the key and repair scripts were removed. `_v2` data is not encrypted.
- **Admin script**: `generate-user-insert.js` only writes `users_v2` rows. The `:legacy` npm script is gone.
- **Config**: removed the unused `*_API_SOURCE` variables from `.env.example` and `docker-compose.nas.yml`.

A search of `server/src` and `server/scripts` finds no references to `users`, `products`, `product_images`, `invoices`, `sales`, `audit_logs`, `discount_codes` or `login_attempts`. Only the schema script's `_v2` tables are needed, so Railway starts with a clean database.

## Progress log

**Last updated 2026-11-01.**

Current state (2026-11-01):
- The Railway API service is live at `crafty-keep-sakes-production.up.railway.app`, built with the Dockerfile builder (`server/Dockerfile`) and getting active deployments. It was reported as deploying from `main`.
- Service source (confirmed in the Railway settings): the correct repo, Root Directory `/`, branch `main`.
- Build and deploy settings (confirmed in the Railway dashboard): the Dockerfile path is set to `/server/Dockerfile`. A **Pre-deploy Command** of `node scripts/apply-schema.js` was tried on the `main` service and failed with `Cannot find module '/app/server/scripts/apply-schema.js'`, because `main` has neither the script nor the Dockerfile lines that copy it into the image. Both are in this migration branch (`cks-railway-migration`, up to date with `main`, no conflicts). **Re-enable the pre-deploy command only after this PR is merged**, and leave it empty until then. Once merged, check the deploy logs for `Applied phase1_schema_v2.sql: 24 tables`. Only merged schema changes then reach Railway.
- `railway.json` (Dockerfile builder, same pre-deploy command) is also only on this branch. Until the merge, the dashboard settings are what is in effect.
- Schema changes must stay additive and idempotent (K2), or a failing script blocks every deploy.
- The MySQL service is running, and the latest schema (24 tables) has been applied by the schema script.
- The API can talk to the Railway database.
- An earlier service created from the Railway Express starter template (Railpack/bun build, `/misc/status` healthcheck) was not our API. Do not use it, and delete it if it still exists.
- Verified (2026-11-01) with the local app run via `npm run dev:railway` (loads `server/.env.railway`, sets `ALLOW_REMOTE_DB=1`) against the Railway DB and MinIO bucket: admin login, creating a product with an image upload (stored in the bucket, served from the public URL), and updating and deleting a user. The server prints `Database target: ...` on start, and refuses a non-local `DB_HOST` outside production unless `ALLOW_REMOTE_DB=1`.
- Also fixed: the login handler never wrote `users_v2.last_login_at` (stale `source` check), which was behind the 3 failing server tests. The redundant client `POST /api/v2/audit` was removed because the server writes audit events itself.
- Not yet done: `MINIO_*` variables on the Railway API (it runs `main`, which lacks the adapter), Square payment variables on Railway, a custom domain, K1/K3/K4, curl checks against the Railway URL (Phase B), Cloudflare and browser tests (Phases C and D), the existing-image migration, and the data move from the NAS. The NAS stays the live API until cutover.

Earlier status (2026-10-13):
- A MinIO template has been added to the Railway project. Nothing uses it yet (section 6).
- Cloudflare, domain, SSL and dev/prod separation are planned and documented (sections 7 and 8). No DNS, `.env` or Vercel changes have been made.
- An end-to-end review was done. Gaps are in section 9, split into service configuration and code changes.
- Whether the MySQL service and API variables below have been completed is not recorded here. Confirm in the Railway dashboard and update this log.

Done (as of 2026-10-12):
- [x] Server no longer depends on any legacy table (Priority 1).
- [x] Schema script and runner fixed and tested against the NAS database.
- [x] Railway project created from the repo. The build now works with `railway.json` (Dockerfile build from the repo root, no Root Directory).

Where it stopped: the build succeeds, then the deploy crashes on missing environment variables. The MySQL service has not been added yet, so the `DB_*` reference variables have nothing to point at.

Likely causes, in order:
1. `JWT_SECRET` is missing. In production the server throws at start unless it is set and at least 16 characters (`server/src/ts-common/jwt-secret.ts`). This is a certain crash if it is unset.
2. `DB_*` variables are missing. The pre-deploy schema step (`node scripts/apply-schema.js`) fails without them, so the deploy never starts.

Next steps, in order:
1. In the Railway project, add **New > Database > MySQL**.
2. On the API service, add variables:
   - `DB_HOST=${{MySQL.MYSQLHOST}}`, `DB_PORT=${{MySQL.MYSQLPORT}}`, `DB_USER=${{MySQL.MYSQLUSER}}`, `DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}`, `DB_DATABASE=${{MySQL.MYSQLDATABASE}}` (if the MySQL service is named differently, use that name instead of `MySQL`)
   - `JWT_SECRET` set to a long random string, or the current NAS value to keep sessions valid
   - `CORS_ORIGIN` set to the site's public URL
   - `NODE_ENV=production`
3. Redeploy. The deploy logs should show `Applied phase1_schema_v2.sql: 24 tables` and `Roles: admin, customer`, then `Server running on port <n>`.
4. Generate a public domain and check `/api/v2/products` returns 200.
5. Create the first admin (section 1, "First admin and sample data").
6. Then continue with images (section 3), the client (section 4) and the data move (section 5).

## 0. Create the Railway project and link the repo

Do this first. The most common failure is setting the service's **Root Directory** to `/server`.

**Do not set a Root Directory.** [`server/Dockerfile`](../server/Dockerfile) is written to build from the repository root (its first line says so). It copies both `server/...` and `client/public/images`, and the image folder lives outside `server/`. With Root Directory set to `/server`, Railway only sees that folder, so `COPY server/package*.json` and `COPY client/public/images` fail and the build errors out.

1. In Railway, **New Project > Deploy from GitHub repo**, and pick `CFisher46/crafty-keep-sakes`. Authorise the Railway GitHub app for the repo if it isn't listed.
2. Add the database: **New > Database > MySQL** in the same project. This is the `MySQL` service the variable references below point to.
3. Open the API service (the one created from the repo) and set:
   - **Settings > Source > Root Directory:** leave empty (the repo root).
   - **Builder and Dockerfile path:** set by [`railway.json`](../railway.json) in the repo root (`builder: DOCKERFILE`, `dockerfilePath: server/Dockerfile`), so nothing needs setting in the dashboard. Railway only auto-detects a Dockerfile at the root. Without this file it uses Railpack on the repo root, which fails with `No start command detected`. If the build log still starts with `Railpack`, the file was not picked up: check it is on the branch Railway deploys, or set `RAILWAY_DOCKERFILE_PATH=server/Dockerfile` as a service variable, or choose Dockerfile under **Settings > Build**.
   - **Settings > Networking > Generate Domain** to get the public URL. Railway injects `PORT`, and the server reads it, so no port needs setting.
   - **Pre-deploy command:** `node scripts/apply-schema.js` is also set in `railway.json` (see Create the schema below). It needs the `DB_*` variables from section 2, so set them before the first deploy or the deploy fails on the missing database settings.
   - **Variables:** everything in section 2.
4. Watch paths (`/server/**` and `/client/public/images/**`) are also in `railway.json`, so docs-only commits do not trigger a deploy.
5. Deploy and read the **Build Logs** and **Deploy Logs**.

### If it still fails
| Symptom in the log | Cause |
|--------------------|-------|
| `COPY server/package*.json: not found` or `client/public/images: not found` | Root Directory is set. Clear it |
| `Railpack ... No start command detected` (or `Nixpacks was unable to generate a build plan`) | The Dockerfile is not being used. Make sure `railway.json` is on the deployed branch, or set `RAILWAY_DOCKERFILE_PATH=server/Dockerfile` |
| Build passes but the deploy is "crashed" with `ECONNREFUSED` or `ENOTFOUND` | `DB_*` variables missing or wrong. Use the reference variables in section 2 |
| `JWT_SECRET` or other missing-variable errors at start | Add the variable in section 2 |
| Healthy deploy but the site shows 502 | The domain was generated for the wrong port. Remove it and generate again, or check that the app logs `Server running on port <n>` |

## 1. Database

### Schema source of truth
[`server/scripts/migrations/phase1_schema_v2.sql`](../server/scripts/migrations/phase1_schema_v2.sql) creates all 24 `_v2` tables and seeds the `admin` and `customer` roles.
It was compared with the live database and with every SQL statement in `server/src`. Tables, columns and enum values all match, including:

- `invoices_v2.tracking_info` and the `billing_*` columns
- the blog tables (`blog_posts_v2`, `blog_post_views_v2`, `blog_post_images_v2`, `blog_post_comments_v2`, `blog_post_reactions_v2`)
- `invoice_views_v2`, `notifications_v2` and `reviews_v2`, added after the first 21 tables
- `payments_v2`, which the Square integration writes to (`provider`, `provider_ref`, `event_type`)

Re-run this comparison before migrating if the schema or queries have changed since.

### Do not migrate
The live database also contains tables the server no longer uses. Leave these out of Railway:

- `audit_logs`, `discount_codes`, `login_attempts`, `sales`
- `users_legacy_archive`, `products_legacy_archive`, `product_images_legacy_archive`, `invoices_legacy_archive`
- `server/scripts/archive-legacy-tables.sql` is only for the old database and is not needed
- No server code reads these tables any more (see Priority 1)

### Optional: connect to the Railway MySQL from your laptop
Railway's MySQL is only reachable on the private network (`mysql.railway.internal`) by default. To run scripts from your laptop, use the public TCP proxy:

1. In Railway, open the MySQL service and go to **Settings > Networking > TCP Proxy**. Enable it for port `3306`. Railway gives you a public host and port, for example `<name>.proxy.rlwy.net:12345`.
2. Open the service's **Variables** tab and note `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE` (usually `railway`) and `MYSQL_PUBLIC_URL`. The public URL already contains the proxy host and port.
3. Install a client if you don't have one: `brew install mysql-client` (or use the Railway CLI below).
4. Test the connection:
   `mysql -h <proxy-host> -P <proxy-port> -u root -p --database railway`
   Enter `MYSQLPASSWORD` when prompted. Run `SELECT 1;` to confirm.

Alternative: install the Railway CLI (`brew install railway`), run `railway login`, `railway link`, then `railway connect MySQL`. It opens a `mysql` shell through the proxy without handling the host or port yourself.

Notes:
- The proxy is open to the internet and protected only by the password. Keep it enabled for the setup and data import, then **disable it** afterwards. The API on Railway uses the private address.
- Never commit the password or `MYSQL_PUBLIC_URL`. Use your shell or an untracked env file.
- The proxy counts as egress traffic on Railway, so avoid leaving large imports running repeatedly.

### Create the schema
The schema script is many statements, and Railway's web query editor only runs one statement at a time (pasting the file fails with a syntax error at the second `CREATE TABLE`). Use one of these instead.

**Option A (recommended, no egress): run it inside Railway.** The API image includes the runner (`server/scripts/apply-schema.js`) and the schema. `railway.json` sets the API service's pre-deploy command to `node scripts/apply-schema.js` (it can also be set under **Settings > Deploy > Pre-deploy Command**). Every deploy then applies the schema over Railway's private network using the service's `DB_*` variables. It is safe to repeat because every statement is `IF NOT EXISTS` or an upsert. The deploy fails if the schema fails. Check the deploy logs for `Applied phase1_schema_v2.sql: 24 tables` and `Roles: admin, customer`.

**Option B: from your laptop through the TCP proxy.** The schema setup sends a few KB out of Railway, so the egress cost is negligible. Egress only matters for large exports or leaving the proxy open. From `server/`:
`DB_HOST=<proxy-host> DB_PORT=<proxy-port> DB_USER=root DB_PASSWORD=<password> DB_DATABASE=railway npm run db:apply-schema`
or with the `mysql` client:
`mysql -h <proxy-host> -P <proxy-port> -u root -p railway < server/scripts/migrations/phase1_schema_v2.sql`

**Option C: the web editor.** Paste and run each `CREATE TABLE` block and the final role insert one at a time, in file order (24 tables, then the roles). Slow and easy to get wrong.

After applying it:
1. `SHOW TABLES;` should list 24 `_v2` tables on a fresh database.
2. `SELECT code FROM roles_v2;` should show `admin` and `customer`. Registration relies on `customer`.

### First admin and sample data
- A fresh database has no users, and self-registration only creates customers, so the first admin is created by hand.
- On your laptop, in `server/`, generate the SQL. It needs no database connection:
  `npm run user:generate-insert -- --email you@example.com --password '<strong password>' --firstName Chris --lastName Fisher --role admin`
- The output is three independent statements, separated by `-- next statement`, with no session variables. Paste and run them **one at a time, in order**, in Railway's MySQL **Data / Query** tab (or all at once with the `mysql` client or the schema runner's connection).
- Check it: `SELECT u.email, r.code FROM users_v2 u JOIN user_roles_v2 ur ON ur.user_id = u.id JOIN roles_v2 r ON r.id = ur.role_id;` should show your email with `admin`.
- Then log in on the site. Change the password after first login if you used a temporary one.
- If a statement fails part way, running the first one again fails with a duplicate email. Run `DELETE FROM users_v2 WHERE email = '<email>';` (this also removes dependent rows) and start again.
- Optional: `npm run seed:products:v2` loads sample products and categories. It reads the `DB_*` variables, so point them at the proxy for the run:
  `DB_HOST=<proxy-host> DB_PORT=<proxy-port> DB_USER=root DB_PASSWORD=<password> DB_DATABASE=railway npm run seed:products:v2`

## 2. API service

Settings to set on the Railway service:

| Variable | Notes |
|----------|-------|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE` | Use Railway reference variables, e.g. `${{MySQL.MYSQLHOST}}`, `${{MySQL.MYSQLPORT}}`, `${{MySQL.MYSQLUSER}}`, `${{MySQL.MYSQLPASSWORD}}`, `${{MySQL.MYSQLDATABASE}}`. This uses the private address, not the proxy |
| `JWT_SECRET` | Required. Reuse the current value to keep existing sessions valid |
| `CORS_ORIGIN` | The public URL of the site |
| `NODE_ENV` | `production` |
| `PORT` | Railway normally provides this |
| `CLIENT_URL` | The public site URL. Square redirects customers back to `/payments/result` on it. Defaults to the first `CORS_ORIGIN` |
| `PAYMENTS_PROVIDER` | `square`. Empty turns payments off. `mock` is refused when `NODE_ENV=production` |
| `SQUARE_ENVIRONMENT` | `sandbox` (default) until going live, then `production` |
| `SQUARE_SANDBOX_ACCESS_TOKEN`, `SQUARE_SANDBOX_LOCATION_ID`, `SQUARE_SANDBOX_WEBHOOK_SIGNATURE_KEY` | Sandbox credentials. Set these first, as on the NAS |
| `SQUARE_PRODUCTION_ACCESS_TOKEN`, `SQUARE_PRODUCTION_LOCATION_ID`, `SQUARE_PRODUCTION_WEBHOOK_SIGNATURE_KEY` | Live credentials. Only needed when `SQUARE_ENVIRONMENT=production`. Never put them in a local `.env` |
| `SQUARE_WEBHOOK_URL` | Exactly the URL in the Square webhook subscription (`https://api.craftykeepsakes.uk/api/v2/payments/webhook`). The signature check fails if it differs |

`ENCRYPTION_KEY` and the `*_API_SOURCE` variables are no longer read; leave them off Railway. Mark all the secrets above as Railway secrets, and see the README "Payments" and "Going live" sections for the Square steps.

### Database connection
`server/src/ts-common/database.ts` creates the pool from the `DB_*` variables only. If Railway's MySQL requires TLS or a connection limit, that needs adding there.

## 3. Images

Product and blog images are stored on disk, not in the database. Only the paths are in MySQL.

- Blog uploads go to `client/public/images/blog`, and product images go under `client/public/images`.
- The NAS compose file mounts a volume at `/app/client/public/images`.
- On Railway, attach a volume at the same path. Without it, uploaded images disappear on every deploy.
- Copy the existing image files from the NAS volume into the new one so existing products and posts keep their pictures.

## 4. Client

- Point the client's `REACT_APP_API_URL` at the new API URL.
- Make sure the API's `CORS_ORIGIN` matches the client's URL, because auth uses cookies (`credentials: include`).
- In production the auth cookie is `secure`, so both sides must be served over HTTPS.

## 5. Data move (if keeping existing data)
Export from the NAS database and import into Railway after the schema is created. Do it in this order so foreign keys are satisfied:

1. `roles_v2`, `users_v2`, `user_roles_v2`, `customer_profiles_v2`
2. `categories_v2`, `products_v2`, `product_categories_v2`, `product_images_v2`
3. `baskets_v2`, `basket_items_v2`, `orders_v2`, `order_items_v2`
4. `invoices_v2`, `invoice_views_v2`, `invoice_items_v2`, `payments_v2`
5. `blog_posts_v2`, `blog_post_views_v2`, `blog_post_images_v2`, `blog_post_comments_v2`, `blog_post_reactions_v2`
6. `reviews_v2`
7. `notifications_v2`, `audit_events_v2`

`invoice_views_v2`, `notifications_v2` and `reviews_v2` are easy to forget: without them, admin "new invoice" highlighting, notification history and customer reviews start empty.

## 6. Object storage (MinIO) — adapter built, not yet verified end to end

The server can now store product and blog images in MinIO (`server/src/ts-common/image-storage.ts`). It is off unless `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, an endpoint and `MINIO_PUBLIC_URL` are all set; otherwise images are written to disk as before (tests always use disk).

| Variable | Notes |
|----------|-------|
| `MINIO_PRIVATE_ENDPOINT` | `host:port` on Railway's private network. Only resolves inside Railway |
| `MINIO_ENDPOINT` | Optional override that wins over the private endpoint. Use a public proxy or URL for local testing |
| `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` | A dedicated access key, not the root credentials |
| `MINIO_BUCKET` | Defaults to `images` |
| `MINIO_PUBLIC_URL` | Required. The base URL browsers load images from. The stored DB value is `<MINIO_PUBLIC_URL>/<file>` (blog images under `blog/`), which fits the 1024-character columns |

The bucket must allow public read for browsers to load the stored URLs (planned at `files.craftykeepsakes.uk`). Images already stored as `/images/...` keep working from disk until they are migrated. Remaining before this is done: test an upload against the real bucket, a read-only public policy, and migrating existing paths.

Notes from the original plan:

- Keep API to MinIO traffic on the private network (`*.railway.internal`). Do not use the public proxy from the API.
- Never expose the MinIO console port (9001) publicly. Use it only through a temporary public domain or the Railway CLI, and remove it afterwards.
- Create a bucket for images and use a dedicated access key for the API, not the root credentials.
- Uploads should go through the API, which then writes to MinIO. Cloudflare's free plan limits proxied request bodies to 100 MB.
- If browsers load images directly, make only a read-only bucket or prefix public and serve it from `files.craftykeepsakes.uk` (see section 7). Otherwise have the API stream or presign them.
- Presigned URLs are signed for a specific host, so sign them against the public hostname that clients will actually use.
- When this is adopted, section 3 (disk volume) is replaced, and the image paths already stored in MySQL need a migration or a path-to-URL mapping.
- Dev and prod must use separate buckets (or separate MinIO services) and separate credentials.

## 7. Cloudflare, domains and SSL — planned, not yet in use

Goal: Cloudflare in front of Vercel (frontend) and Railway (API) acting as DNS and WAF. Nothing is moved yet. This is the runbook for when we do.

### Hostnames

| Hostname | Points to | Notes |
|----------|-----------|-------|
| `craftykeepsakes.uk`, `www` | Vercel | Add both under the Vercel project's Domains settings |
| `api.craftykeepsakes.uk` | NAS (Cloudflare Tunnel `cks-api`) until cutover, then Railway API | Stays on the NAS until cutover. Do not repoint it early |
| `api-prd.craftykeepsakes.uk` | Railway API service | Railway-behind-Cloudflare test hostname, set up first with DNS only, then proxied |
| `api-dev.craftykeepsakes.uk` | NAS (same tunnel `cks-api`, second published route) | Fallback and test-data API. Verified 2026-11-01. Add it to the NAS `CORS_ORIGIN` if browsers call it directly |
| `files.craftykeepsakes.uk` | Railway MinIO (bucket) service | Stable public image URL. Set `MINIO_PUBLIC_URL=https://files.craftykeepsakes.uk/images` before real data, because the DB stores full URLs |

For dev/prod separation, reserve a parallel set (for example `dev.`, `api-dev.`, `files-dev.`) and use separate Railway environments.

### SSL: avoiding conflicts

Vercel and Railway each issue their own certificate for their own hostname. Conflicts come from Cloudflare's SSL mode and from enabling the proxy too early.

1. Set Cloudflare SSL/TLS mode to **Full (strict)**. Do not use Flexible, which causes redirect loops with both providers.
2. Add DNS records as **DNS only (grey cloud)** first:
   - Railway: CNAME `api` to the `*.up.railway.app` target, plus the `_railway-verify` TXT record shown in Railway.
   - Vercel: the records shown in Vercel. `www` is a CNAME to `cname.vercel-dns.com`. The apex uses an A record or CNAME flattening.
3. Wait until both dashboards show the domain as valid and the certificate as issued.
4. Switch the records to **Proxied (orange cloud)**. Leave "Always Use HTTPS" on and add no extra redirects at Cloudflare for these hosts.
5. Vercel discourages proxying its hostnames. It works in Full (strict), but it means two CDNs/WAFs. Recommended: proxy `api` and `files`, and decide separately whether to proxy the Vercel hostnames.

### Making the WAF see real traffic

Today `client/vercel.json` rewrites `/api/*` to `https://api.craftykeepsakes.uk`. That makes Vercel's servers the caller, so Cloudflare sees Vercel IPs and per-IP rules and rate limits are ineffective. When moving over:

- Set `REACT_APP_API_URL=https://api.craftykeepsakes.uk` in Vercel environment variables (read at build time by `client/src/api/apiPath.ts`) so browsers call the API directly.
- Set `CORS_ORIGIN` on the API to the site origin. Auth uses cookies with `credentials: include`.
- Both hosts share the registrable domain, so `SameSite` cookie behaviour should be fine. Confirm during testing.
- Remove the `/api` rewrite from `client/vercel.json` once verified.

### Locking the origin to Cloudflare

Railway has no IP allowlist, so the `*.up.railway.app` URL can bypass the WAF.

- Add a Cloudflare Transform Rule (Rules > Overview > Create rule > Modify Request Header) that sets a static request header `X-Origin-Secret` on requests where the hostname is `api-prd.craftykeepsakes.uk` (later `api.`). Cloudflare rejects header names starting with `x-cf-`, so do not use that prefix. Generate the value with `openssl rand -hex 32`.
- Set the same value as `ORIGIN_SECRET` on the Railway API. The middleware (`ts-common/origin-guard.ts`, built, K4) rejects other requests with 403, and is inactive while the variable is unset. `/health` and the Square webhook paths are exempt.
- Client IP (K1, built): only a request with the valid secret is trusted to have come through Cloudflare, so only then is `CF-Connecting-IP` used as `req.ip`. The rate limiters therefore see the real client. `trust proxy` stays at 1 for the non-Cloudflare case.
- Rollout order: deploy the code, add the Transform Rule, confirm `curl https://api-prd.../api/v2/products` still returns 200, then set `ORIGIN_SECRET` on Railway. Setting the variable before the rule exists locks you out (403), and the fix is to unset it.
- Remove or disable the generated `*.up.railway.app` domain once `ORIGIN_SECRET` is enforced.
- **Exempt the Square webhook** (`POST /api/v2/payments/webhook` and `/api/payments/webhook`) from the secret-header check, WAF challenges, bot fight mode and body-modifying rules. Square sends no secret header and calls from its own IPs. The route is protected by Square's HMAC signature over the raw body, so do not add any rule that rewrites or compresses the body. Rate limit it loosely, and never let it share the per-IP bucket used for logins.

### Suggested WAF baseline

- Managed rules enabled, and bot fight mode on.
- Rate limit `/api/auth/*` (login and registration) and checkout endpoints. Do not rate limit or challenge the Square webhook (see above).
- Cache rule for `files.*` images. Bypass cache for `api.*`.

### Cutover order

1. Add the Railway custom domain and verify it with the proxy off.
2. Turn the proxy on and set SSL to Full (strict).
3. Update `REACT_APP_API_URL`, `CORS_ORIGIN` and the secret header, then redeploy both sides.
4. Test login, basket, checkout (including a Square sandbox payment that marks the invoice paid via the webhook) and image loading end to end.
5. Turn off the NAS cloudflared tunnel (`docker-compose.nas.yml`) only after everything is verified.

### Rollback

Switch the affected DNS records back to DNS only, or repoint `api` to the NAS tunnel. Keep the NAS running until sign-off.

## 8. Local development vs production databases

Goal: local development keeps using the NAS database and never touches the production Railway database. That keeps the NAS database safe to add, change and wipe test data in, and keeps the production database free of test data. Only the production deployment uses the Railway database. No code change is needed for this, only configuration discipline. No `.env` changes have been made yet; this section is notes for the cutover.

### How it works today

- The API reads `DB_*` only from environment variables (`server/src/ts-common/database.ts`). `dotenv.config()` loads `server/.env` locally and never overrides variables that are already set.
- `server/.env` and `client/.env` are git-ignored, so each machine chooses its own database.
- On Railway, the `DB_*` variables are set in the service (reference variables to the Railway MySQL). There is no `.env` file in the image, so production always uses Railway's values.
- So: keep `DB_*` in `server/.env` pointing at the NAS, and never put Railway credentials there.

### Rules to keep them separate

- Do not run local code through `railway run` or `railway shell` and do not use `railway variables --kv > .env`. These inject Railway's `DB_*` into the local process, and because dotenv does not override, local would silently hit production.
- If the Railway MySQL TCP proxy is enabled for schema setup (section 1), use it only for that task, in a separate shell or client, and disable it afterwards. Never save its host or password in `server/.env`.
- Local `JWT_SECRET` must differ from the production one so local tokens are not valid in production.
- Do not commit credentials. `server/.env.example` should keep placeholders only.
- The NAS database must not be reachable from the internet. Local development reaches it over the LAN or VPN.

### Frontend: which API a build calls

The Vercel deployment is only the frontend. It reaches the Railway database indirectly, through whichever API `REACT_APP_API_URL` points to (or the `/api` rewrite in `client/vercel.json`, which is currently hard-coded to `api.craftykeepsakes.uk`).

- In Vercel, scope `REACT_APP_API_URL` per environment: **Production** to the production API, **Preview** and **Development** to a non-production API (or the NAS-backed one).
- Local `client/.env` should use `http://localhost:3001`, so `npm start` talks to the local API and therefore the NAS database.
- The hard-coded rewrite in `client/vercel.json` applies to every Vercel deployment including previews, so previews would hit the production API and the Railway database. Remove it, or replace it with per-environment config, as part of the cutover in section 7.
- Set `CORS_ORIGIN` separately per API environment.

### Open items for the dev/prod split

- Decide what Preview deployments should use: a second Railway environment with its own MySQL, or the NAS.
- Decide whether the NAS API remains as the long-term dev backend or is retired after cutover. If it stays, it also needs its own bucket or volume for images (section 6).
- Add a startup log or guard that prints the DB host (never the password) and refuses to start with `NODE_ENV=development` if the host matches the Railway MySQL host. This would catch accidental use of production from a laptop.

## 9. Review findings: gaps to close before cutover

Found in an end-to-end review. Split into **service configuration** (dashboards, DNS, env vars, no repo change) and **code changes** (a PR in this repo). Nothing here has been done yet.

### A. Service configuration (no code change)

| # | Gap | Action |
|---|-----|--------|
| C1 | **No backups for the Railway MySQL.** The NAS is the only safe copy until the move | Enable Railway volume backups on the MySQL service if the plan supports it, and take a manual `mysqldump` of the NAS before the data move and of Railway right after it. Record where dumps are kept and test one restore |
| C2 | **No cutover window or write freeze** | Pick a quiet time. Put the site in maintenance or stop NAS writes, take the final export, import into Railway (section 5), verify row counts per table, switch `REACT_APP_API_URL`/DNS, then re-enable. Orders placed on the NAS after the export are lost, so the freeze must cover the export, import and switch. **Payments:** before the final export, wait until no invoice is `unpaid` with a recent `payment_link_created` row in `payments_v2`. A Square webhook that reaches Railway for an invoice that only exists on the NAS finds no invoice, so the customer pays but the invoice stays unpaid. If the webhook URL changes, update `SQUARE_WEBHOOK_URL` and the Square subscription together |
| C3 | **`CORS_ORIGIN` is a comma-separated list** (`app.ts` splits on `,`) | Set it to every real origin, for example `https://craftykeepsakes.uk,https://www.craftykeepsakes.uk`, not a single URL. Set separately per Railway environment |
| C4 | **Cookie behaviour once the browser calls `api.` directly.** The auth cookie is `httpOnly`, `secure` in production and `sameSite: 'strict'` with no `domain` (`routes/v2/auth.ts`). `api.craftykeepsakes.uk` and `www.craftykeepsakes.uk` are same-site, so this works | It will **not** work from `*.vercel.app` preview URLs, because they are cross-site to the API and the cookie is dropped. Test logins on the real domain only, or give previews a subdomain of `craftykeepsakes.uk` (for example `dev.`) |
| C5 | **Railway deploy health** | After the code change in K3, set the health check path on the Railway service (or in `railway.json`) so a failing deploy is not promoted and rollback works |
| C6 | **Local runs of `apply-schema.js`** read `DB_*` from `server/.env`. If that ever held Railway values, a local run would change production | Same rule as section 8: `server/.env` stays on the NAS. The script is safe to repeat (see K2) but should still never run against production by accident |
| C7 | **Stale `*.up.railway.app` domain** | Remove it once the custom domain works and the origin secret header is enforced (section 7) |
| C8 | **Images baked into the Docker image and mounted as a volume at the same path.** A Railway volume mounted at `/app/client/public/images` hides the files baked in at build time | Seed the volume by copying the NAS files in (section 3), or skip the volume by moving to MinIO (section 6). Do not rely on the baked-in copy once a volume is attached |

### B. Code changes (repo PRs)

| # | Change | Why |
|---|--------|-----|
| K1 | **Fix `trust proxy`** (also keep the Square webhook out of the shared limiter buckets). `app.set("trust proxy", 1)` in `server/src/app.ts` assumes one proxy. With Cloudflare then Railway there are two hops | Otherwise `req.ip` is a Cloudflare address and the auth, register and failed-login rate limiters share a bucket across all users. Use the real client IP (`CF-Connecting-IP`, trusted only when the origin secret header is valid) as the limiter key, or raise the hop count. Add a test |
| K2 | **Schema runner repeatability: no change needed.** All 24 tables use `CREATE TABLE IF NOT EXISTS` and the roles seed uses `ON DUPLICATE KEY UPDATE`, so the pre-deploy command is safe on every deploy | Keep it that way. Any future schema change must be additive and idempotent, or it will block every deploy |
| K3 | **Add a health endpoint** (for example `GET /health` that checks the DB with `SELECT 1`) | Needed for C5. Keep it out of the rate limiters and the auth |
| K4 | **Origin secret header middleware** (reject `api.*` requests without the Cloudflare-set `X-Origin-Secret`, value from a Railway variable) | Section 7. Exempt `/health` so Railway's checks pass, and the Square webhook paths (`/api/payments/webhook`, `/api/v2/payments/webhook`), which carry no secret header |
| K5 | **Startup guard for the DB host** (log host only, never the password; refuse to start in non-production if the host is the Railway MySQL host) | Section 8. Prevents local use of the production DB |
| K6 | **Remove or replace the `/api` rewrite in `client/vercel.json`** and move to per-environment `REACT_APP_API_URL` | Sections 7 and 8. Previews must not call the production API |
| K7 | **MinIO storage adapter** replacing disk writes in `image-upload.ts` / `upload-images-directory.ts`, plus an image-path migration for existing rows | Section 6. Larger piece of work, do it as its own PR |
| K8 | **Explicit cookie settings reviewed** if previews or a different parent domain are ever needed (`sameSite`, `domain`) | C4. Only change if the testing in C4 shows a problem |

### Order of work

1. Code PRs that are safe before any move: K1, K3, K4 (inactive until the variable is set), K5, K6 (behind per-environment config).
2. Service configuration that does not affect production: C1, C3, C5, and the Cloudflare DNS-only records from section 7.
3. Dry run on a second Railway environment (dev) with a copy of the NAS data, including C4 and the WAF rules.
4. Production cutover with C2, then C7.
5. K7 (MinIO) separately, after the move is stable.

## 10. Checklist
- [ ] Railway project created from the repo with no Root Directory and Dockerfile path `server/Dockerfile`
- [ ] Railway MySQL created
- [ ] Schema script applied, 24 `_v2` tables present
- [ ] `roles_v2` has `admin` and `customer`
- [ ] First admin user created
- [ ] API variables set
- [ ] Payment variables set (`PAYMENTS_PROVIDER=square`, `SQUARE_ENVIRONMENT=sandbox`, `SQUARE_SANDBOX_*`, `SQUARE_WEBHOOK_URL`, `CLIENT_URL`)
- [ ] Square webhook URL still matches `SQUARE_WEBHOOK_URL` after the move; a sandbox payment flips the invoice to paid on Railway
- [ ] No pending Square payment links at the cutover freeze
- [ ] Square webhook exempted from the origin-secret check and WAF rules
- [ ] Image volume attached and files copied
- [ ] Client points at the new API and CORS matches
- [ ] Login, registration, shop, basket, checkout and blog checked on the new environment
- [ ] TCP proxy (if enabled) disabled once setup and data import are done
- [ ] NAS left running until Railway is verified
- [ ] (Planned) MinIO bucket, scoped access key and private-network connection set up; image path migration decided
- [ ] (Planned) Railway custom domain verified with proxy off, then proxied with SSL mode Full (strict)
- [ ] (Planned) Vercel domains added; `REACT_APP_API_URL` and `CORS_ORIGIN` updated; `/api` rewrite removed
- [ ] (Planned) Origin secret header enforced; `*.up.railway.app` bypass closed
- [ ] (Planned) WAF baseline and rate limits applied
- [ ] (Planned) Local `server/.env` confirmed to point at the NAS DB with a separate `JWT_SECRET`, and Railway credentials absent from local files
- [ ] (Planned) Vercel `REACT_APP_API_URL` scoped per environment (Production vs Preview/Development)
- [ ] (Planned) Dev/prod split reviewed across domains, environments, buckets and credentials
- [ ] (Planned) Config: Railway MySQL backups enabled, NAS dump taken, restore tested (C1)
- [ ] (Planned) Config: cutover window and write freeze agreed, row counts verified after import (C2)
- [ ] (Planned) Config: `CORS_ORIGIN` lists apex and `www`; login tested on the real domain (C3, C4)
- [ ] (Planned) Config: image volume seeded or replaced by MinIO (C8)
- [x] Code: `trust proxy` / client IP fix for rate limiters (K1) and origin secret middleware (K4), built and inactive until `ORIGIN_SECRET` is set (section 7)
- [x] Code: DB host startup guard (K5), built (`ts-common/db-target.ts`, `ALLOW_REMOTE_DB=1` set by `npm run dev:railway`)
- [x] Code: `/health` endpoint (K3), built. It is also set as the Railway health check path in `railway.json` (C5); confirm the dashboard shows `/health` after the first deploy
- [ ] (Planned) Code: MinIO storage adapter and image path migration (K7)

## 11. Switchover test plan (temporary)

Temporary runbook for proving Railway works end to end before `api.craftykeepsakes.uk` is repointed. Remove or fold into section 10 once the cutover is done. The NAS stays the live API throughout. Test against a temporary hostname such as `api-new.craftykeepsakes.uk`, never the live `api.` name, until phase E.

### Is MinIO needed now?
No. The API still writes and serves images from disk (`/images` static route in `server/src/app.ts`), and nothing reads MinIO. Product images baked into the Docker image are served as-is, but uploads on Railway vanish on redeploy unless a volume is attached (C8). For switchover testing either attach a volume at `/app/client/public/images` or accept that uploads are throwaway. Connecting MinIO is code change K7 and should be its own PR after the move.

### Phase A: seed the admin on Railway
1. On your laptop, in `server/`, generate the SQL (needs no database): `npm run user:generate-insert -- --email <admin email> --password '<strong temporary password>' --firstName <first> --lastName <last> --role admin`. Do not paste the password into chat or commit it.
2. Run the three statements one at a time, in order, in the Railway MySQL **Data / Query** tab.
3. Verify: `SELECT u.email, r.code FROM users_v2 u JOIN user_roles_v2 ur ON ur.user_id = u.id JOIN roles_v2 r ON r.id = ur.role_id;` shows the email with `admin`.
4. Optional sample data: `npm run seed:products:v2`, with `DB_*` pointed at the TCP proxy for the run (section 1). Disable the proxy afterwards.

### Phase B: API on Railway (no Cloudflare yet)
Run against `https://crafty-keep-sakes-production.up.railway.app` with curl or Postman, since cookies from the Vercel site will not stick to a cross-site host (C4).
- [ ] `GET /api/v2/products` returns 200
- [ ] Log in as the admin: `POST /api/v2/auth/login` returns 200 and sets the auth cookie
- [ ] An authenticated admin call works (for example users or audit list), and an unauthenticated one returns 401
- [ ] Register a test customer, then log in as them
- [ ] Add to basket and check out. With `PAYMENTS_PROVIDER` unset the order is placed without payment
- [ ] Check the server logs for errors and for the schema line once the pre-deploy command is re-enabled

### Phase C: Cloudflare in front of the temporary hostname
1. In Railway, add custom domain `api-new.craftykeepsakes.uk` to the API service. In Cloudflare add the CNAME and the verification TXT as **DNS only**.
2. Wait for Railway to show the domain valid with a certificate, then switch to **Proxied** and confirm SSL/TLS is **Full (strict)**.
3. Checks:
- [ ] `curl -i https://api-new.craftykeepsakes.uk/api/v2/products` returns 200 and the response has `cf-ray` and `server: cloudflare` (traffic is passing through Cloudflare)
- [ ] No redirect loop, and no certificate warning
- [ ] The direct `*.up.railway.app` URL still works (expected until K4 is in place; record it as a known bypass)
- [ ] Cloudflare **Security > Events** shows the test requests
- [ ] A WAF custom rule or rate limit rule for `/api/v2/auth/login` can be hit deliberately, and shows as blocked or challenged in Events
- [ ] Bot fight mode and managed rules are on, and do not block normal curl or browser calls to the API
- [ ] Caching: `api-new` responses are not cached (`cf-cache-status: DYNAMIC` or `BYPASS`)
- [ ] Client IP: confirm in the server logs which address is seen. If it is a Cloudflare IP, K1 (`trust proxy` and `CF-Connecting-IP`) is needed before rate limits are meaningful
- [ ] Secret header (K4), once built: requests without `X-Origin-Secret` to `api-new` are rejected, `/health` and the Square webhook paths are exempt

### Phase D: browser and Vercel test
Use a Vercel build or preview that sets `REACT_APP_API_URL=https://api-new.craftykeepsakes.uk`, served from a hostname under `craftykeepsakes.uk` (for example `dev.craftykeepsakes.uk`). A `*.vercel.app` preview is cross-site and will drop the `sameSite: strict` auth cookie (C4).
- [ ] Add the origin to Railway `CORS_ORIGIN` (comma-separated, apex and `www` as needed)
- [ ] Log in, refresh the page (session restore), log out
- [ ] Browse products, add to basket, check out (the logged-in checkout redirect works)
- [ ] Admin pages: invoices, users, reporting, notifications and their links
- [ ] Image loading (baked-in images, then an upload, and whether it survives a redeploy)
- [ ] Blog posts, comments and reviews
- [ ] Check the browser console and Network tab for CORS or cookie errors

### Phase E: Square on Railway (sandbox)
1. Set on Railway: `PAYMENTS_PROVIDER=square`, `SQUARE_ENVIRONMENT=sandbox`, the `SQUARE_SANDBOX_*` values, `CLIENT_URL`, and `SQUARE_WEBHOOK_URL=https://api-new.craftykeepsakes.uk/api/v2/payments/webhook`.
2. In the Square sandbox console add a **second** webhook subscription for that URL (events `payment.created` and `payment.updated`) and use its signature key. Keep the NAS subscription as it is.
3. Check:
- [ ] Checkout redirects to the Square sandbox page, and a test card payment returns to `/payments/result`
- [ ] Square shows webhook deliveries with status 200 (not 401, 403 or 404)
- [ ] The invoice flips to `paid`, and admin and customer notifications are created
- [ ] A declined test card leaves the invoice unpaid and creates a `payment_failed` notification
- [ ] Cloudflare Events show no blocks or challenges on `POST /api/v2/payments/webhook`
- [ ] The webhook is not affected by rate limits or the secret header

### Phase F: cutover and rollback
1. Pre-cutover: take a NAS `mysqldump` and a Railway backup, wait for no unpaid invoices with recent payment links, and agree the write freeze (C2).
2. Export from the NAS and import into Railway in the section 5 order, then compare row counts per table.
3. Repoint `api.craftykeepsakes.uk` to Railway (DNS only, then proxied), set the Vercel `REACT_APP_API_URL`, update `SQUARE_WEBHOOK_URL` and the Square subscription if the hostname changed, then repeat Phases B to E on the live name.
4. Rollback: repoint `api` back to the NAS tunnel and keep the NAS running until sign-off.
5. Clean up: re-enable the pre-deploy command, disable the MySQL TCP proxy, remove the stale `*.up.railway.app` domain once K4 is enforced, and delete this section.

### Gaps found by this plan
- **`/health` endpoint** (K3) is built: `GET /health` runs `SELECT 1` (3 s timeout) and returns `{"status":"ok"}` or 503 `{"status":"unavailable"}`, with no auth and no rate limit. Railway's health check path is set to `/health` in `railway.json`.
- **Rate limiters and client IP** (K1) are fixed in code: the real IP comes from `CF-Connecting-IP`, trusted only on requests with a valid `X-Origin-Secret`. This needs the Transform Rule and `ORIGIN_SECRET` (section 7) to take effect.
- **No origin lock** (K4), so the `*.up.railway.app` host bypasses Cloudflare.
- **Uploads are not durable** on Railway without a volume or MinIO (C8, K7).
- **Pre-deploy schema step is off** until this PR merges.
