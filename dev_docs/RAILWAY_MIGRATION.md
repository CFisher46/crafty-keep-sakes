# Railway Migration

Steps and findings for moving the API and MySQL database from the NAS to Railway.

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

### Connect to the Railway MySQL from your laptop
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
Run these from the repository root with the proxy connection above.

1. Apply the schema. The script has no `CREATE DATABASE` or `USE`, so it runs in the database you name:
   `mysql -h <proxy-host> -P <proxy-port> -u root -p railway < server/scripts/migrations/phase1_schema_v2.sql`
2. Check the tables: `SHOW TABLES;` should list 21 `_v2` tables and nothing else.
3. Check the roles: `SELECT name FROM roles_v2;` should show `admin` and `customer`. Registration relies on `customer`.
4. Every `CREATE TABLE` uses `IF NOT EXISTS`, so the script can be re-run safely after a partial failure.

### First admin and sample data
- A fresh database has no users, and self-registration only creates customers. Create the first admin with `npm run user:v2:generate-insert` (in `server/`). It needs `JWT_SECRET` and `ENCRYPTION_KEY` to match the API, so use the same values you set on Railway. Run the generated SQL through the same `mysql` connection.
- Optional: `npm run seed:products:v2` loads sample products and categories. It reads the `DB_*` variables, so point them at the proxy for the run:
  `DB_HOST=<proxy-host> DB_PORT=<proxy-port> DB_USER=root DB_PASSWORD=<password> DB_DATABASE=railway npm run seed:products:v2`

## 2. API service

Settings to set on the Railway service:

| Variable | Notes |
|----------|-------|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE` | Use Railway reference variables, e.g. `${{MySQL.MYSQLHOST}}`, `${{MySQL.MYSQLPORT}}`, `${{MySQL.MYSQLUSER}}`, `${{MySQL.MYSQLPASSWORD}}`, `${{MySQL.MYSQLDATABASE}}`. This uses the private address, not the proxy |
| `JWT_SECRET` | Required. Reuse the current value to keep existing sessions valid |
| `ENCRYPTION_KEY` | Reuse the current value. Also set `ENCRYPTION_KEY_PREVIOUS` if encrypted data exists |
| `AUTH_SOURCE` | Set to `v2` (see below) |
| `CORS_ORIGIN` | The public URL of the site |
| `NODE_ENV` | `production` |
| `PORT` | Railway normally provides this |

### Login fallback to the legacy `users` table
`server/src/routes/v2/auth.ts` defaults `AUTH_SOURCE` to `dual`. It looks in `users_v2` and then falls back to the old `users` table. That table does not exist on Railway, so logging in with an unknown email returns a 500 instead of 401. Setting `AUTH_SOURCE=v2` avoids it.

The `AUTH_API_SOURCE`, `PRODUCTS_API_SOURCE`, `USERS_API_SOURCE`, `AUDIT_API_SOURCE` and `BASKET_API_SOURCE` variables in `docker-compose.nas.yml` are not read by the current server code and can be left out.

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
- [ ] Railway MySQL created and TCP proxy enabled
- [ ] Connected from the laptop with `mysql` and `SELECT 1` works
- [ ] Schema script applied, 21 `_v2` tables present
- [ ] `roles_v2` has `admin` and `customer`
- [ ] First admin user created
- [ ] API variables set, including `AUTH_SOURCE=v2`
- [ ] Image volume attached and files copied
- [ ] Client points at the new API and CORS matches
- [ ] Login, registration, shop, basket, checkout and blog checked on the new environment
- [ ] TCP proxy disabled once setup and data import are done
- [ ] NAS left running until Railway is verified
