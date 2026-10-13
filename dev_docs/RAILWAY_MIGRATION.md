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

**Last updated 2026-10-13.**

Status since the last update:
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
3. Redeploy. The deploy logs should show `Applied phase1_schema_v2.sql: 21 tables` and `Roles: admin, customer`, then `Server running on port <n>`.
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
[`server/scripts/migrations/phase1_schema_v2.sql`](../server/scripts/migrations/phase1_schema_v2.sql) creates all 21 `_v2` tables and seeds the `admin` and `customer` roles.
It was compared with the live database and with every SQL statement in `server/src`. Tables, columns and enum values all match, including:

- `invoices_v2.tracking_info` and the `billing_*` columns
- the blog tables (`blog_posts_v2`, `blog_post_views_v2`, `blog_post_images_v2`, `blog_post_comments_v2`, `blog_post_reactions_v2`)

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

**Option A (recommended, no egress): run it inside Railway.** The API image includes the runner (`server/scripts/apply-schema.js`) and the schema. `railway.json` sets the API service's pre-deploy command to `node scripts/apply-schema.js` (it can also be set under **Settings > Deploy > Pre-deploy Command**). Every deploy then applies the schema over Railway's private network using the service's `DB_*` variables. It is safe to repeat because every statement is `IF NOT EXISTS` or an upsert. The deploy fails if the schema fails. Check the deploy logs for `Applied phase1_schema_v2.sql: 21 tables` and `Roles: admin, customer`.

**Option B: from your laptop through the TCP proxy.** The schema setup sends a few KB out of Railway, so the egress cost is negligible. Egress only matters for large exports or leaving the proxy open. From `server/`:
`DB_HOST=<proxy-host> DB_PORT=<proxy-port> DB_USER=root DB_PASSWORD=<password> DB_DATABASE=railway npm run db:apply-schema`
or with the `mysql` client:
`mysql -h <proxy-host> -P <proxy-port> -u root -p railway < server/scripts/migrations/phase1_schema_v2.sql`

**Option C: the web editor.** Paste and run each `CREATE TABLE` block and the final role insert one at a time, in file order (21 tables, then the roles). Slow and easy to get wrong.

After applying it:
1. `SHOW TABLES;` should list 21 `_v2` tables on a fresh database.
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
4. `invoices_v2`, `invoice_items_v2`, `payments_v2`
5. `blog_posts_v2`, `blog_post_views_v2`, `blog_post_images_v2`, `blog_post_comments_v2`, `blog_post_reactions_v2`
6. `audit_events_v2`

## 6. Object storage (MinIO) — planned, not yet in use

A MinIO template has been added to the Railway project. Nothing uses it yet; the API still writes images to disk (section 3). This section records the intended setup so it can be reviewed end to end later.

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
| `api.craftykeepsakes.uk` | Railway API service | Add under the service's Networking > Custom Domain |
| `files.craftykeepsakes.uk` (optional) | Railway MinIO S3 port | Only if browsers load images directly |

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

- Add a Cloudflare Transform Rule that sets a secret request header (for example `X-CF-Secret`) on requests to `api.*`.
- Reject API requests without the correct header in server middleware. Store the value as a Railway variable.
- Use `CF-Connecting-IP` for the client IP in logging and rate limiting, and configure Express `trust proxy` accordingly.
- Remove or disable the generated `*.up.railway.app` domain once the custom domain works, if the header check is not in place.

### Suggested WAF baseline

- Managed rules enabled, and bot fight mode on.
- Rate limit `/api/auth/*` (login and registration) and checkout endpoints.
- Cache rule for `files.*` images. Bypass cache for `api.*`.

### Cutover order

1. Add the Railway custom domain and verify it with the proxy off.
2. Turn the proxy on and set SSL to Full (strict).
3. Update `REACT_APP_API_URL`, `CORS_ORIGIN` and the secret header, then redeploy both sides.
4. Test login, basket, checkout and image loading end to end.
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
| C2 | **No cutover window or write freeze** | Pick a quiet time. Put the site in maintenance or stop NAS writes, take the final export, import into Railway (section 5), verify row counts per table, switch `REACT_APP_API_URL`/DNS, then re-enable. Orders placed on the NAS after the export are lost, so the freeze must cover the export, import and switch |
| C3 | **`CORS_ORIGIN` is a comma-separated list** (`app.ts` splits on `,`) | Set it to every real origin, for example `https://craftykeepsakes.uk,https://www.craftykeepsakes.uk`, not a single URL. Set separately per Railway environment |
| C4 | **Cookie behaviour once the browser calls `api.` directly.** The auth cookie is `httpOnly`, `secure` in production and `sameSite: 'strict'` with no `domain` (`routes/v2/auth.ts`). `api.craftykeepsakes.uk` and `www.craftykeepsakes.uk` are same-site, so this works | It will **not** work from `*.vercel.app` preview URLs, because they are cross-site to the API and the cookie is dropped. Test logins on the real domain only, or give previews a subdomain of `craftykeepsakes.uk` (for example `dev.`) |
| C5 | **Railway deploy health** | After the code change in K3, set the health check path on the Railway service (or in `railway.json`) so a failing deploy is not promoted and rollback works |
| C6 | **Local runs of `apply-schema.js`** read `DB_*` from `server/.env`. If that ever held Railway values, a local run would change production | Same rule as section 8: `server/.env` stays on the NAS. The script is safe to repeat (see K2) but should still never run against production by accident |
| C7 | **Stale `*.up.railway.app` domain** | Remove it once the custom domain works and the origin secret header is enforced (section 7) |
| C8 | **Images baked into the Docker image and mounted as a volume at the same path.** A Railway volume mounted at `/app/client/public/images` hides the files baked in at build time | Seed the volume by copying the NAS files in (section 3), or skip the volume by moving to MinIO (section 6). Do not rely on the baked-in copy once a volume is attached |

### B. Code changes (repo PRs)

| # | Change | Why |
|---|--------|-----|
| K1 | **Fix `trust proxy`.** `app.set("trust proxy", 1)` in `server/src/app.ts` assumes one proxy. With Cloudflare then Railway there are two hops | Otherwise `req.ip` is a Cloudflare address and the auth, register and failed-login rate limiters share a bucket across all users. Use the real client IP (`CF-Connecting-IP`, trusted only when the origin secret header is valid) as the limiter key, or raise the hop count. Add a test |
| K2 | **Schema runner repeatability: no change needed.** All 21 tables use `CREATE TABLE IF NOT EXISTS` and the roles seed uses `ON DUPLICATE KEY UPDATE`, so the pre-deploy command is safe on every deploy | Keep it that way. Any future schema change must be additive and idempotent, or it will block every deploy |
| K3 | **Add a health endpoint** (for example `GET /health` that checks the DB with `SELECT 1`) | Needed for C5. Keep it out of the rate limiters and the auth |
| K4 | **Origin secret header middleware** (reject `api.*` requests without the Cloudflare-set `X-CF-Secret`, value from a Railway variable) | Section 7. Exempt `/health` so Railway's checks pass |
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
- [ ] Schema script applied, 21 `_v2` tables present
- [ ] `roles_v2` has `admin` and `customer`
- [ ] First admin user created
- [ ] API variables set
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
- [ ] (Planned) Code: `trust proxy` / client IP fix for rate limiters (K1)
- [ ] (Planned) Code: `/health` endpoint, then Railway health check path set (K3, C5)
- [ ] (Planned) Code: origin secret middleware (K4) and DB host startup guard (K5)
- [ ] (Planned) Code: MinIO storage adapter and image path migration (K7)
