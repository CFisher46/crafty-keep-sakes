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

### Create the schema
1. Add a MySQL service in Railway and copy its connection details.
2. Run the schema script against it, for example with the `mysql` client:
   `mysql -h <host> -P <port> -u <user> -p <database> < server/scripts/migrations/phase1_schema_v2.sql`
3. Check that `roles_v2` contains `admin` and `customer`. Registration relies on the `customer` role.

### First admin and sample data
- A fresh database has no users, and self-registration only creates customers. Create the first admin with `npm run user:v2:generate-insert` (in `server/`) and run the generated SQL.
- Optional: `npm run seed:products:v2` loads sample products and categories.

## 2. API service

Settings to set on the Railway service:

| Variable | Notes |
|----------|-------|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE` | From the Railway MySQL service |
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
- [ ] Railway MySQL created and schema script applied
- [ ] `roles_v2` has `admin` and `customer`
- [ ] First admin user created
- [ ] API variables set, including `AUTH_SOURCE=v2`
- [ ] Image volume attached and files copied
- [ ] Client points at the new API and CORS matches
- [ ] Login, registration, shop, basket, checkout and blog checked on the new environment
- [ ] NAS left running until Railway is verified
