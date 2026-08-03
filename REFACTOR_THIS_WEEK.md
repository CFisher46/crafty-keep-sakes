# Refactor This Week

Quick companion to `REFACTOR_PR_STAGES.md` for short dev sessions.

## Current Focus

Primary target: Stage 1 - Auth Bridge (legacy + v2)

Secondary target (once Stage 1 is merged): Stage 2 - Parallel API and Client Switchboard

Why now:

- v2 tables exist.
- v2 admin user exists.
- Auth bridge unlocks real v2 login testing before broader endpoint migration.

## This Week Outcomes

- [x] Implement `AUTH_SOURCE` mode (`legacy | dual | v2`).
- [x] Add dual-source login lookup (v2 first, legacy fallback in dual mode).
- [ ] Keep JWT payload shape backward compatible.
- [ ] Add auth bridge tests.
- [ ] Verify manual login with seeded v2 admin user.
- [ ] Define per-domain fallback flags for parallel legacy and v2 APIs.

## Session Plan (30-90 mins)

Use this small loop each time:

1. Pick one checkbox in "This Week Outcomes".
2. Make only that change.
3. Run quality gates.
4. Update docs/checklist.

## Quality Gates Per Session

- [x] `cd client && npm run lint`
- [x] `cd server && npm run lint`
- [x] `cd server && npm test -- --runInBand`

## Stage 1 Task Slice (PR-ready)

## Slice A - Config and scaffolding

- [x] Add `AUTH_SOURCE` env support.
- [x] Add helper/service for source-aware user lookup.
- [ ] No route behavior changes yet.

Exit:

- [x] Build/lint/test green.

## Slice B - Login handler bridge

- [ ] Update login handler to use source-aware lookup.
- [ ] Preserve existing response and cookie contract.

Exit:

- [ ] v2 login works.
- [ ] legacy login still works in dual mode.

## Slice C - Auth tests expansion

- [ ] Add tests: v2 login success/failure.
- [ ] Add tests: legacy fallback success in dual mode.
- [ ] Keep existing me/logout tests passing.

Exit:

- [ ] auth test suite green.

## Slice D - PR wrap-up

- [ ] Update `REFACTOR_PR_STAGES.md` Stage 1 checkboxes.
- [ ] Add notes to Decision Log (if behavior changed).
- [ ] Open PR with risk/rollback notes.

## Blockers To Watch

- Password source mismatch between legacy `password` and v2 `password_hash`.
- Payload field differences between legacy and v2 profile sources.
- Token claim shape drift that could break client assumptions.
- Missing switchboard utility can force emergency code revert instead of configuration rollback.

## Next Up (After Stage 1)

- [ ] Add route versioning strategy for migrated domains.
- [ ] Add client per-domain API switch utilities.
- [ ] Test rapid rollback by toggling flags from v2 to legacy.

## Done Definition (This Week)

- [ ] Stage 1 merged or ready-for-review with tests.
- [ ] CI green.
- [ ] Tracker files updated.
