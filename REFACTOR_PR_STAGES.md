# Refactor PR Stages Tracker

Purpose: split the v2 migration into small, reviewable PRs with explicit test gates and clear done criteria.

## How To Use This File

- Use one PR per stage unless noted.
- Do not start a stage until the previous stage is merged and deployed to the target environment.
- Tick the stage checkbox when merged.
- Keep the "Decision Log" updated for scope changes.

## Decision Log

- 2026-08-09: Image upload tests were isolated to a temp directory in test mode so multer-based product upload coverage no longer pollutes `client/public/images`. This is a Stage 5 support cleanup, not new scope.
- 2026-08-09: Stage 6 user/profile migration is complete. Admin CRUD now uses `users_v2` + `user_roles_v2`, profile reads/writes use `customer_profiles_v2`, and legacy `users` is no longer part of active auth/profile flows.

## Stage Overview

| Stage | PR Name | Scope | Risk | Depends On |
|---|---|---|---|---|
| 0 | Foundation and v2 Schema | v2 tables, bootstrap scripts, baseline tests | Low | None |
| 1 | Auth Bridge (legacy + v2) | Login/session dual source with feature flag | Medium | Stage 0 |
| 2 | Parallel API and Client Switchboard | Side-by-side legacy and v2 routes and client handlers with rollout flags | Medium | Stage 1 |
| 3 | Server Authorization Guards | Admin and self-or-admin middleware + tests | Medium | Stage 2 |
| 4 | Product Read Migration | Product GET/filter/by-id from v2 tables | Medium | Stage 3 |
| 5 | Product Write Migration | Product create/update/image upload to v2 | High | Stage 4 |
| 6 | User/Profile Migration | Admin user CRUD + profile ownership on v2 | High | Stage 3 |
| 7 | Basket-Order-Invoice Migration | Checkout transaction model in v2 | High | Stage 3 |
| 8 | Audit Migration | Append-only audit_events_v2 read path + guards | Medium | Stage 3 |
| 9 | Endpoint Test Hardening | Exhaustive endpoint regression, authz matrix, and rollback confidence tests | Medium | Stages 3-8 |
| 10 | Legacy Decommission | Remove legacy reads/writes and cleanup | High | Stages 4-9 |

## Stage Checklists

## [x] Stage 0 - Foundation and v2 Schema

PR Goal: establish v2 structures and migration guardrails without runtime endpoint cutover.

- [x] Add v2 schema SQL with `_v2` suffix tables.
- [x] Seed roles for `admin` and `customer`.
- [x] Add user bootstrap SQL generator for v2.
- [x] Keep legacy user generator compatibility path.
- [x] Add server baseline tests for auth me/logout.
- [x] Ensure lint is clean in client and server.

Exit Criteria:

- [x] `npm run lint` passes in both client and server.
- [x] `npm test` passes in server.
- [x] v2 admin user can be created and verified in MySQL.

## [ ] Stage 1 - Auth Bridge (legacy + v2)

PR Goal: allow login/session for v2 users while preserving legacy login during transition.

Implementation:

- [x] Add `AUTH_SOURCE` mode: `legacy | dual | v2`.
- [x] Implement login user lookup service that supports both schemas.
- [x] Preserve current JWT shape to avoid client breakage.
- [x] Add fallback order for dual mode (v2 first, legacy second).
- [x] Log auth source in audit-friendly metadata.

Tests:

- [x] Login success (v2 admin).
- [x] Login success (legacy user) in dual mode.
- [x] Login failure (bad password).
- [x] `/api/auth/me` valid token and missing token.
- [x] Logout clears cookie.

Exit Criteria:

- [ ] Manual login works with seeded `users_v2` admin.
- [ ] Existing legacy login still works in dual mode.
- [x] All auth tests green.

## [ ] Stage 2 - Parallel API and Client Switchboard

PR Goal: create explicit fallback controls by keeping legacy and v2 APIs available in parallel, and switch via feature flags.

Implementation:

- [x] Introduce versioned route namespaces for migrated domains (for example, `/api/v2/...`) while keeping legacy routes active.
- [x] Add server routing flags to select default route target by domain (auth/products/users/orders/audit).
- [x] Add client API handlers that can call either legacy or v2 endpoints via per-domain flags.
- [x] Add one switchboard utility per client domain so fallback is one config change, not a code revert.
- [x] Document emergency rollback sequence (flip flags, restart service, verify smoke tests).

Tests:

- [x] Legacy route path still passes after v2 route is introduced.
- [x] V2 route path passes for the same scenario.
- [x] Flag flip test confirms client can call legacy then v2 without code changes.
- [x] Smoke tests validate both paths during transition.

Rollback Runbook:

1. Set domain flags back to `legacy` for the affected domain(s) in the environment.
2. Restart the server so `app.ts` re-resolves the canonical route targets.
3. Confirm smoke requests to `/api/<domain>` return the legacy router shape.
4. Leave direct `/api/v2/<domain>` aliases in place for isolated verification.
5. Re-run the focused route-selection test before resuming rollout.

Rollback Drill Procedure (non-prod):

1. Set one domain to `v2` (example auth), keep the rest `legacy`.
2. Restart the server.
3. Validate canonical route follows the selected source:
	- `GET /api/auth/me` should follow `AUTH_API_SOURCE`
4. Validate direct v2 alias remains callable:
	- `GET /api/v2/auth/me`
5. Flip the same domain back to `legacy`.
6. Restart the server.
7. Re-run smoke checks:
	- `GET /api/auth/me` now follows legacy path again
	- `GET /api/v2/auth/me` still callable for isolated testing
8. Run local verification gates:
	- `cd server && npm run lint`
	- `cd server && npm test -- --runInBand`
	- `cd client && npm run lint`
	- `cd client && CI=true npm test -- --watchAll=false --passWithNoTests`

Suggested Environment Flags:

- `AUTH_API_SOURCE=legacy|v2`
- `PRODUCTS_API_SOURCE=legacy|v2`
- `USERS_API_SOURCE=legacy|v2`
- `AUDIT_API_SOURCE=legacy|v2`

Rollback Drill Evidence (complete this once run):

- Date:
- Environment:
- Operator:
- Domain tested:
- Flag flip performed:
- Canonical route check result:
- Direct `/api/v2` alias check result:
- Verification commands result:
- Notes:

Exit Criteria:

- [x] Every migrated domain has both legacy and v2 callable routes.
- [x] Client handler switch can revert traffic in minutes.
- [ ] Rollback runbook tested at least once in non-prod.

## [x] Stage 3 - Server Authorization Guards

PR Goal: enforce permissions on API, not just in UI.

Implementation:

- [x] Add middleware helpers: `requireAuth`, `requireRole('admin')`, `requireSelfOrAdmin`.
- [x] Protect admin endpoints (`/users`, product write routes, audit read route).
- [x] Protect profile route ownership.
- [x] Return consistent `401` and `403` responses.

Tests:

- [x] Unauthenticated requests return `401`.
- [x] Authenticated non-admin requests return `403` on admin routes.
- [x] Owner can access own profile.
- [x] Non-owner customer blocked.

Exit Criteria:

- [x] Admin-only routes are not publicly writable/readable.
- [x] Ownership checks enforced for profile operations.

## [ ] Stage 4 - Product Read Migration

PR Goal: move product read paths to v2 without changing client contract.

Implementation:

- [x] Route reads to `products_v2`, `product_images_v2`, and categories relation.
- [x] Keep response shape backward compatible.
- [x] Verify filter/sort behavior parity.

Tests:

- [x] List live products.
- [x] Filter combinations.
- [x] Product by id.
- [x] Empty and not-found behavior.

Exit Criteria:

- [x] Shop and landing page render correctly from v2 read paths.

## [ ] Stage 5 - Product Write Migration

PR Goal: migrate create/update/image upload to v2 product tables.

Implementation:

- [x] POST product writes to `products_v2`.
- [x] PUT product updates mutable fields only.
- [x] Image upload writes to `product_images_v2`.
- [x] Enforce admin role guard.

Tests:

- [x] Admin create/update/upload success.
- [x] Validation failures return `400`.
- [x] Non-admin blocked (`403`).

Exit Criteria:

- [x] Admin product tooling functions end-to-end on v2.

## [x] Stage 6 - User/Profile Migration

PR Goal: split identity and profile usage to v2 user model.

Implementation:

- [x] Move admin user list/create/update/delete to `users_v2` + `user_roles_v2`.
- [x] Move profile reads/writes to `customer_profiles_v2`.
- [x] Keep password hashing in `users_v2.password_hash`.
- [x] Apply ownership and admin guards.

Tests:

- [x] Admin user CRUD.
- [x] Customer self profile read/update.
- [x] Customer cross-user access denied.

Exit Criteria:

- [x] Legacy `users` dependency removed from active auth/profile flows.

## [x] Stage 7 - Basket-Order-Invoice Migration

PR Goal: implement transactional checkout model in v2.

Implementation:

- [x] Add basket endpoints (`baskets_v2`, `basket_items_v2`).
- [x] Add checkout flow creating `orders_v2` + `order_items_v2` + `invoices_v2` + `invoice_items_v2`.
- [x] Use one DB transaction and rollback on failure.
- [x] Add customer ownership constraints and admin invoice read/update controls.
- [x] Sync client API routing and basket UI to the v2 basket endpoints.

Tests:

- [x] Basket add/update/remove.
- [x] Checkout success creates all records.
- [x] Transaction rollback on forced failure.
- [x] Customer can only see own orders/invoices.

Exit Criteria:

- [x] Checkout no longer depends on legacy invoices path.
- [x] Order history and invoice details are available in the client profile flow using `/api/v2/basket/orders` and `/api/v2/basket/invoices/:id`.
- [x] Selected order/invoice rows can be opened, cleared, and updated through the modal workflow.

Current state:

- [x] Stage 7 is complete and ready for merge; the implemented profile order history and invoice modal satisfy the user-facing v2 basket flow without requiring a separate standalone page.
- [ ] Add admin invoice management screen to call the protected `/api/v2/basket/invoices/:id` update route.

## [x] Stage 8 - Audit Migration

PR Goal: move to append-only audit events with controlled read access.

Implementation:

- [x] Migrate writes to `audit_events_v2` from service layer.
- [x] Remove public audit write route.
- [x] Admin-only read route with filter/pagination.

Tests:

- [x] Important mutations emit audit rows.
- [x] Audit endpoint requires admin.
- [x] Audit rows are append-only.

Exit Criteria:

- [x] Legacy audit table not used by active routes.

## [ ] Stage 9 - Endpoint Test Hardening

PR Goal: add exhaustive API coverage so breakages are caught early as migration complexity grows.

Current progress:

- [x] Build an endpoint inventory file grouped by domain and role.
- [x] Add integration tests for all auth outcomes per endpoint (`200`, `401`, `403`).
- [x] Add request validation tests for malformed payloads and missing fields (`400`).
- [x] Add data contract tests for critical responses to prevent schema drift.
- [x] Add smoke test bundle for canary deploy and rollback validation.
- [x] Add CI reporting for endpoint coverage trend (minimum threshold gate).

Implementation:

- [x] Build an endpoint inventory file grouped by domain and role.
- [x] Add integration tests for all auth outcomes per endpoint (`200`, `401`, `403`).
- [x] Add request validation tests for malformed payloads and missing fields (`400`).
- [x] Add data contract tests for critical responses to prevent schema drift.
- [x] Add smoke test bundle for canary deploy and rollback validation.
- [x] Add CI reporting for endpoint coverage trend (minimum threshold gate).

Tests:

- [ ] Auth endpoints: login, me, logout, invalid credentials, expired/invalid token.
- [ ] Users endpoints: admin allowed, non-admin denied, owner checks enforced.
- [ ] Products endpoints: public reads, admin-only writes, validation failures.
- [ ] Audit endpoints: admin-read only, no public write.
- [ ] Invoice/order endpoints: ownership checks and admin overrides.
- [ ] Route source tests: canonical and `/api/v2` parity for each domain.

Exit Criteria:

- [x] Endpoint auth matrix covered for all active routes.
- [x] Critical endpoint contract snapshots/baselines recorded.
- [x] CI fails on regression in endpoint authorization or contract checks.

## [ ] Stage 10 - Legacy Decommission

PR Goal: remove legacy table dependencies and dead code.

Implementation:

- [ ] Remove legacy dual-mode flags and fallback logic.
- [ ] Remove legacy SQL files/routes no longer used.
- [ ] Update docs and runbooks.
- [ ] Prepare SQL archival/drop script for old tables (manual execution).

Tests:

- [ ] Full regression test pass (client + server).
- [ ] Smoke test critical user journeys.

Exit Criteria:

- [ ] Runtime uses v2 tables only.
- [ ] PR checklist and docs complete.

## Cross-PR Quality Gates (every stage)

- [ ] Client lint: `cd client && npm run lint`
- [ ] Server lint: `cd server && npm run lint`
- [ ] Server tests: `cd server && npm test -- --runInBand`
- [ ] Update this tracker checkboxes
- [ ] Add PR notes for migration assumptions and rollback

## Decision Log

- 2026-08-03: Adopted `_v2` suffix strategy to run legacy and refactor side-by-side.
- 2026-08-03: Unified user generation script defaults to v2 and supports legacy fallback.
- 2026-08-03: Chosen migration sequence starts with auth bridge to unblock v2 login testing.
- 2026-08-03: Added Auth Slice A scaffolding with `AUTH_SOURCE` resolver and dual-source lookup service (no route behavior changes yet).
- 2026-08-03: Added explicit parallel API and client switchboard stage so each migrated domain keeps a low-risk fallback path.
- 2026-08-03: Added first switchboard pass with `/api/v2` route aliases and client domain URL helpers for fallback routing.
- 2026-08-03: Added dedicated Endpoint Test Hardening stage before decommission to improve regression safety and rollback confidence.
