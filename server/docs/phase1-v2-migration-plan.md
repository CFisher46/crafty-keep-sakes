# Phase 1 V2 Migration Plan

This phase introduces the new schema in parallel using `_v2` table names.
No production route handlers are switched yet.

## Goals

- Create parallel v2 tables with clean relational boundaries.
- Keep legacy flow running while we migrate endpoint-by-endpoint.
- Pause after schema setup to create a v2 admin user for testability.
- Add test coverage as each feature migrates.

## New Files Added

- `scripts/migrations/phase1_schema_v2.sql`
- `scripts/generate-user-v2-insert.js`

## Step 1: Apply V2 Schema

Run the SQL in your MySQL instance:

```sql
source /absolute/path/to/server/scripts/migrations/phase1_schema_v2.sql;
```

If your client does not support `source`, paste and execute the file content.

## Step 2: Create First V2 Admin User (Pause Gate)

Generate an insert script:

```bash
cd server
npm run user:generate-insert -- \
  --email admin@example.com \
  --password "ChangeMeNow!" \
  --target v2 \
  --role admin \
  --firstName Admin \
  --lastName User
```

Copy the SQL output and execute it in MySQL.

Verification queries:

```sql
SELECT id, email, status FROM users_v2 WHERE email = 'admin@example.com';

SELECT ur.user_id, r.code
FROM user_roles_v2 ur
JOIN roles_v2 r ON r.id = ur.role_id
WHERE ur.user_id = (
  SELECT id FROM users_v2 WHERE email = 'admin@example.com'
);
```

## Step 3: Feature Migration Order

1. Auth (dual-read for login test user, then full v2)
2. Product read APIs
3. Product admin APIs (create/update/images)
4. User/admin management
5. Basket -> checkout -> order/invoice
6. Audit events write/read migration

## API and Testing Gate per Feature

For each feature migration PR:

1. Add/adjust route(s)
2. Add/adjust DB SQL module(s)
3. Add tests before cutover is merged
4. Verify legacy behavior still passes where expected
5. Add migration note in PR description

## Suggested Test Matrix

### Auth

- Login success with v2 admin user.
- Login failure with invalid password.
- `GET /api/auth/me` without token returns 401.
- `POST /api/auth/logout` clears cookie and returns 200.

### Products

- Public list only returns live products.
- Filter combinations return stable sorted results.
- Admin create/update requires admin role.

### Users/Admin

- Admin can list/create/update/delete users.
- Customer cannot access admin-only user endpoints.
- Customer can only read/update own profile.

### Basket/Checkout

- Add/update/remove basket items.
- Checkout creates order + order_items + invoice + invoice_items in one transaction.
- Failed transaction rolls back all writes.

### Audit

- Sensitive actions create an audit row.
- Audit rows are append-only (no update/delete routes).

## Rollback Plan (Phase 1)

- Since no runtime cutover occurs in Phase 1, rollback is simple:
  - stop using `_v2` tables
  - optionally drop `_v2` tables later after review

## Notes

- Keep `_v2` tables as the migration target until all feature domains are switched.
- Do not expose admin write APIs without server-side role checks.
- Prefer endpoint-level integration tests (supertest) over implementation-detail tests.
