# Refactor PR Stages Tracker

Purpose: split the v2 migration into small, reviewable PRs with explicit test gates and clear done criteria.

## How To Use This File

- Use one PR per stage unless noted.
- Do not start a stage until the previous stage is merged and deployed to the target environment.
- Tick the stage checkbox when merged.
- Keep the "Decision Log" updated for scope changes.

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
| 9 | Legacy Decommission | Remove legacy reads/writes and cleanup | High | Stages 4-8 |

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
- [ ] Preserve current JWT shape to avoid client breakage.
- [ ] Add fallback order for dual mode (v2 first, legacy second).
- [ ] Log auth source in audit-friendly metadata.

Tests:

- [ ] Login success (v2 admin).
- [ ] Login success (legacy user) in dual mode.
- [ ] Login failure (bad password).
- [ ] `/api/auth/me` valid token and missing token.
- [ ] Logout clears cookie.

Exit Criteria:

- [ ] Manual login works with seeded `users_v2` admin.
- [ ] Existing legacy login still works in dual mode.
- [ ] All auth tests green.

## [ ] Stage 2 - Server Authorization Guards

PR Goal: create explicit fallback controls by keeping legacy and v2 APIs available in parallel, and switch via feature flags.

Implementation:

- [ ] Introduce versioned route namespaces for migrated domains (for example, `/api/v2/...`) while keeping legacy routes active.
- [ ] Add server routing flags to select default route target by domain (auth/products/users/orders/audit).
- [ ] Add client API handlers that can call either legacy or v2 endpoints via per-domain flags.
- [ ] Add one switchboard utility per client domain so fallback is one config change, not a code revert.
- [ ] Document emergency rollback sequence (flip flags, restart service, verify smoke tests).

Tests:

- [ ] Legacy route path still passes after v2 route is introduced.
- [ ] V2 route path passes for the same scenario.
- [ ] Flag flip test confirms client can call legacy then v2 without code changes.
- [ ] Smoke tests validate both paths during transition.

Exit Criteria:

- [ ] Every migrated domain has both legacy and v2 callable routes.
- [ ] Client handler switch can revert traffic in minutes.
- [ ] Rollback runbook tested at least once in non-prod.

## [ ] Stage 3 - Server Authorization Guards

PR Goal: enforce permissions on API, not just in UI.

Implementation:

- [ ] Add middleware helpers: `requireAuth`, `requireRole('admin')`, `requireSelfOrAdmin`.
- [ ] Protect admin endpoints (`/users`, product write routes, audit read route).
- [ ] Protect profile route ownership.
- [ ] Return consistent `401` and `403` responses.

Tests:

- [ ] Unauthenticated requests return `401`.
- [ ] Authenticated non-admin requests return `403` on admin routes.
- [ ] Owner can access own profile.
- [ ] Non-owner customer blocked.

Exit Criteria:

- [ ] Admin-only routes are not publicly writable/readable.
- [ ] Ownership checks enforced for profile operations.

## [ ] Stage 4 - Product Read Migration

PR Goal: move product read paths to v2 without changing client contract.

Implementation:

- [ ] Route reads to `products_v2`, `product_images_v2`, and categories relation.
- [ ] Keep response shape backward compatible.
- [ ] Verify filter/sort behavior parity.

Tests:

- [ ] List live products.
- [ ] Filter combinations.
- [ ] Product by id.
- [ ] Empty and not-found behavior.

Exit Criteria:

- [ ] Shop and landing page render correctly from v2 read paths.

## [ ] Stage 5 - Product Write Migration

PR Goal: migrate create/update/image upload to v2 product tables.

Implementation:

- [ ] POST product writes to `products_v2`.
- [ ] PUT product updates mutable fields only.
- [ ] Image upload writes to `product_images_v2`.
- [ ] Enforce admin role guard.

Tests:

- [ ] Admin create/update/upload success.
- [ ] Validation failures return `400`.
- [ ] Non-admin blocked (`403`).

Exit Criteria:

- [ ] Admin product tooling functions end-to-end on v2.

## [ ] Stage 6 - User/Profile Migration

PR Goal: split identity and profile usage to v2 user model.

Implementation:

- [ ] Move admin user list/create/update/delete to `users_v2` + `user_roles_v2`.
- [ ] Move profile reads/writes to `customer_profiles_v2`.
- [ ] Keep password hashing in `users_v2.password_hash`.
- [ ] Apply ownership and admin guards.

Tests:

- [ ] Admin user CRUD.
- [ ] Customer self profile read/update.
- [ ] Customer cross-user access denied.

Exit Criteria:

- [ ] Legacy `users` dependency removed from active auth/profile flows.

## [ ] Stage 7 - Basket-Order-Invoice Migration

PR Goal: implement transactional checkout model in v2.

Implementation:

- [ ] Add basket endpoints (`baskets_v2`, `basket_items_v2`).
- [ ] Add checkout flow creating `orders_v2` + `order_items_v2` + `invoices_v2` + `invoice_items_v2`.
- [ ] Use one DB transaction and rollback on failure.
- [ ] Add customer ownership constraints and admin invoice read/update controls.

Tests:

- [ ] Basket add/update/remove.
- [ ] Checkout success creates all records.
- [ ] Transaction rollback on forced failure.
- [ ] Customer can only see own orders/invoices.

Exit Criteria:

- [ ] Checkout no longer depends on legacy invoices path.

## [ ] Stage 8 - Audit Migration

PR Goal: move to append-only audit events with controlled read access.

Implementation:

- [ ] Migrate writes to `audit_events_v2` from service layer.
- [ ] Remove public audit write route.
- [ ] Admin-only read route with filter/pagination.

Tests:

- [ ] Important mutations emit audit rows.
- [ ] Audit endpoint requires admin.
- [ ] Audit rows are append-only.

Exit Criteria:

- [ ] Legacy audit table not used by active routes.

## [ ] Stage 9 - Legacy Decommission

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
