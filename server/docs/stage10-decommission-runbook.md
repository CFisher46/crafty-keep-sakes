# Stage 10 decommission runbook

## Scope
This document covers the final cleanup step after the v2 migration is verified and the runtime is frozen to v2-only canonical routes.

## Runtime freeze checks
Before any archive or drop operation:

1. Confirm app registration is v2-only in `server/src/app.ts`.
2. Confirm legacy route flag logic is removed or intentionally static in `server/src/config/api-route-flags.ts`.
3. Confirm the route contract tests in `server/src/app-routing.test.ts` pass.
4. Confirm the server regression suite passes with `npm test -- --runInBand`.

## Archive plan
Use the SQL script at `server/scripts/archive-legacy-tables.sql` during a maintenance window.

This script performs a non-destructive archive step by renaming legacy tables to `_legacy_archive` names. The archive remains in place until the full UI end-to-end runthrough is complete and the v2 path is validated in production-like conditions.

Current operational policy:

- Keep the archived legacy tables available for a rollback window after the v2-only runtime is live.
- Do not drop the archive names until the UI end-to-end flow has been exercised across the main journeys and a final review confirms there are no remaining legacy reads or writes.
- Once that final review passes, run the DROP statements in the archive script and keep a backup/snapshot for rollback safety.

## Drop plan
Once the team confirms there are no remaining legacy reads or writes:

1. Validate application logs and SQL usage show no active legacy table access.
2. Run the DROP statements in the archive script.
3. Re-run the smoke tests and key user journeys.
4. Keep a backup or snapshot for any rollback requirement.

## Rollback note
If a rollback is required, restore the legacy archive names back to their original names and redeploy the previous runtime build. Until the full UI end-to-end runthrough is complete, the archive should remain present as a safety net.
