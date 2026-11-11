# Security audit

## Scope and limitations

Static review on 11 November 2026 of server API routes and middleware,
authentication and authorization, payment webhooks, uploads, email handling,
client HTML sinks, deployment configuration and relevant tests. Live deployment,
database and Square settings were not verified, and this is not a penetration
test or a guarantee that the application is secure.

## Findings and follow-up

### High: stale account permissions in signed tokens : CKS-2-SECREV-01

**Status:** Fixed in the application; deployment verification outstanding.

Previously, protected routes trusted the role and account state in the JWT until
it expired, even if an administrator demoted or disabled the account. Tokens
last up to 14 days, or 30 days when "remember me" is selected.

Protected routes and `/api/v2/auth/me` now check the current account status,
email verification and role in the database. A role change requires a new login;
inactive, locked, deleted or unverified accounts are denied. A failed account
lookup fails closed with HTTP 503. Existing signed-in users whose roles changed
must sign in again.

**Action:** After deployment, verify that a demoted or disabled test account's
existing cookie is rejected by both an admin endpoint and the session endpoint.
Verify that an active user can still sign in and use their permitted routes.

### High: server-side session revocation : CKS-2-SECREV-01

**Status:** Implemented; deployment verification outstanding.

JWTs carry the account's database token version. Logout increments it
conditionally, revoking all of the account's sessions; password, status and role
updates increment it in the same transaction as the update. A revoked token
cannot become valid again after reactivation or a role restoration. A repeated
logout with an old token cannot revoke a newer login. Failed logout revocation
returns an error and lets the user retry.

**Deployment action:** Apply the `token_version` schema change before running
the updated server. The Railway pre-deploy schema script applies it; other
deployments must run `cd server && npm run db:apply-schema` against the intended
database. All tokens issued before this change lack a version and are rejected:
all users must sign in again.

**Verification action:** After deployment, check that a copied cookie no longer
works after logout, password change, or disabling and re-enabling a test account.
Confirm a new login works and that signing out logs out other devices too.
