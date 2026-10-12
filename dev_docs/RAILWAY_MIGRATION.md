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

**Last updated 2026-10-12.**

Done:
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
- A fresh database has no users, and self-registration only creates customers. Create the first admin with `npm run user:generate-insert` (in `server/`). Run the generated SQL through the same `mysql` connection.
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

## 6. Checklist
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
