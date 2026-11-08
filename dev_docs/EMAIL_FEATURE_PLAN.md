# Crafty Keepsakes -- Email Verification Implementation Plan

## Project overview

**Goal:** Implement email verification for new customer registrations
using Resend, Cloudflare DNS, the existing Express.js backend on
Railway, MySQL, React Email templates, and the Vercel frontend.

**Implementation stages:** 1. Email provider and domain setup 2. MySQL
database changes 3. Express backend implementation 4. React Email
templates 5. React frontend implementation 6. Testing and deployment

## Repository implementation review

The application code now supports registration with a hashed, single-use
24-hour verification token; transactional verification; generic resend
responses with a 60-second per-account cooldown and request rate limit;
login blocking for unverified accounts; and styled registration,
verification and resend experiences. The schema bootstrap also repairs
the existing verification columns and token-table foreign key, and marks
pre-existing admin accounts verified when adding the verification
status.

Still requires deployment/provider access: verify Railway credentials
and frontend URL, configure and verify the Resend domain and DNS records,
confirm the production database migration ran, and complete an end-to-end
delivery check. Automated tests are intentionally left for a later pass.

> **Existing users:** Existing accounts are currently administrative
> accounts, and the application is not yet fully public. The schema
> bootstrap marks existing admin-role accounts verified when it adds
> the verification status. New registrations default to unverified.

------------------------------------------------------------------------

## Stage 1 -- Email provider and domain setup

### 1.1 Set up Resend

-   [-] Create a [Resend account](https://resend.com).
-   [-] Add `craftykeepsakes.uk` as a sending domain.
-   [-] Generate an API key for the production application.
-   [-] Store the API key securely; never expose it in the Vercel
    frontend.
-   [-] Choose the sending address: `verify@craftykeepsakes.uk`.

### 1.2 Configure Cloudflare DNS

-   [-] Open Cloudflare DNS settings for `craftykeepsakes.uk`.
-   [-] Add the DKIM records supplied by Resend.
-   [-] Add the SPF record supplied by Resend, ensuring it does not
    conflict with any existing SPF record.
-   [-] Add a DMARC record.
-   [-] Ensure email-authentication DNS records are configured as
    DNS-only, not proxied.
-   [-] Verify the domain in Resend.
-   [-] Send test emails to Gmail and Outlook.
-   [ ] Initially monitor DMARC using a non-enforcing policy such as
    `p=none`; tighten it once all legitimate sending sources are
    authenticated.

### 1.3 Configure Railway environment variables

Add these variables to the Railway backend service:

``` env
RESEND_API_KEY=
RESEND_FROM_EMAIL=accounts@craftykeepsakes.uk
FRONTEND_URL=https://craftykeepsakes.uk
```

-   [-] Confirm the variables are accessible to Express.
-   [-] Ensure the Resend API key is not exposed through frontend
    environment variables.
-   [-] Confirm the production frontend URL is correct.
-   [ ] Keep separate credentials/configuration for development and
    production where appropriate.

------------------------------------------------------------------------

## Stage 2 -- MySQL database changes

### 2.1 Extend the existing `users_v2` table

Add the verification status and timestamp:

``` sql
ALTER TABLE users_v2
ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0,
ADD COLUMN email_verified_at DATETIME NULL;
```

-   [ ] Confirm the actual users table and primary-key names before
    running the migration. (Confirmed as `users_v2.id` in this codebase.)
-   [ ] Add `email_verified`, defaulting to `0` for new accounts.
-   [ ] Add nullable `email_verified_at`.
-   [x] Mark admin-role accounts verified in the idempotent schema
    bootstrap.
-   [ ] Confirm existing admin accounts retain access after the
    migration.

Example migration for existing trusted accounts (adjust the condition to
match the actual admin role field and values). The schema bootstrap
performs this update when it adds `email_verified`:

``` sql
UPDATE users_v2 u
JOIN user_roles_v2 ur ON ur.user_id = u.id
JOIN roles_v2 r ON r.id = ur.role_id
SET u.email_verified = 1,
    u.email_verified_at = CURRENT_TIMESTAMP
WHERE r.code = 'admin';
```

Only run the update after confirming the role column and exact admin
value used by the application.

### 2.2 Create the `email_verification_tokens_v2` table

Create `email_verification_tokens_v2` to store hashed, temporary
verification tokens:

``` sql
CREATE TABLE email_verification_tokens_v2 (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    token_hash CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    sent_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_token_hash (token_hash),
    INDEX idx_user_id (user_id),

    CONSTRAINT fk_verification_user
        FOREIGN KEY (user_id)
        REFERENCES users_v2(id)
        ON DELETE CASCADE
);
```

The deployment schema bootstrap repairs the existing table's foreign
key and ID type if needed. Legacy raw tokens are invalidated during that
repair so customers can safely request new links.

-   [x] Create the table.
-   [x] Add the foreign key and indexes.
-   [ ] Confirm deleting a user removes associated verification tokens.
-   [ ] Test inserting and retrieving a token record.
-   [ ] Test expiry and used-token handling.

------------------------------------------------------------------------

## Stage 3 -- Express backend implementation

### 3.1 Install dependencies

-   [-] Install `resend`.
-   [-] Install the React Email package(s) needed for components and
    rendering.
-   [-] Configure the backend TypeScript build to support `.tsx` email
    templates.
-   [x] Confirm the TypeScript build includes the email templates
    correctly.

Example:

``` bash
npm install resend react-email
```

Check the current React Email documentation for the component
package/API version selected by the project. Avoid mixing examples from
different major versions.

### 3.2 Create the email service

Implemented at `server/src/email/service/emailService.tsx`.

-   [x] Initialise Resend from `RESEND_API_KEY`.
-   [x] Expose a reusable `sendEmail()` function accepting sender,
    recipient, subject, React template and plain-text alternative.
-   [x] Keep email delivery separate from the authentication handlers.
-   [x] Log provider error types without logging tokens or message content.

### 3.3 Create the verification service

Implemented at `server/src/email/service/verificationService.ts`.

-   [-] Generate secure random tokens using Node.js
    `crypto.randomBytes(32)`.
-   [x] Hash tokens using SHA-256.
-   [x] Store only the hash in MySQL; never store the raw token.
-   [-] Set token expiry to 24 hours.
-   [x] Invalidate previous outstanding tokens when generating a
    replacement.
-   [-] Construct the verification URL using `FRONTEND_URL`.
-   [x] Keep token creation and persistence logic reusable.

### 3.4 Update the registration API

Existing endpoint: `POST /api/v2/auth/register`

-   [-] Extend the existing registration controller.
-   [-] Create new users with `email_verified = 0`.
-   [-] Create the user and initial verification-token record in a
    database transaction where appropriate.
-   [x] Generate and store the verification token hash.
-   [-] Construct the verification URL.
-   [-] Send the verification email.
-   [x] Handle email delivery failures so a temporary provider outage
    does not leave the user unable to retry.
-   [x] Return a suitable response telling the user to check their
    email.

Consider separating account creation from email delivery: if Resend is
temporarily unavailable, retain the account and allow the user to
request another verification email rather than losing the registration.

### 3.5 Create the verification API

Endpoint: `POST /api/v2/auth/verify-email`

-   [x] Accept the raw token from the frontend.
-   [x] Validate that the token is present and correctly formatted.
-   [x] Hash the submitted token using SHA-256.
-   [-] Find the matching token record.
-   [x] Check that it has not expired.
-   [x] Check that it has not already been used.
-   [-] Update `users_v2.email_verified` to `1`.
-   [-] Set `users_v2.email_verified_at` to the current timestamp.
-   [-] Set `email_verification_tokens_v2.used_at` to the current
    timestamp.
-   [x] Perform the verification and token-use updates in one database
    transaction.
-   [x] Return clear success, invalid-token and expired-token responses.
-   [x] Handle already-verified accounts gracefully.

### 3.6 Create the resend-verification API

Endpoint: `POST /api/v2/auth/resend-verification`

-   [-] Accept the user's email address.
-   [x] Check whether the account is already verified.
-   [x] Generate a replacement token and hash.
-   [x] Invalidate previous outstanding tokens.
-   [-] Store the new token record.
-   [x] Send a replacement email.
-   [x] Add rate limiting and a 60-second per-account resend cooldown.
-   [x] Return a generic response that does not reveal whether an email
    address has an account.
-   [x] Ensure email delivery failures can be retried safely.

### 3.7 Authentication and access control

-   [x] Include `email_verified` in the signed-in user payload returned
    by login and `/auth/me`.
-   [x] Login rejects unverified accounts and auth middleware rejects
    tokens that explicitly carry an unverified status.
-   [x] Keep authentication status, account verification and
    role/permission checks as separate concepts.
-   [x] Allow unverified users to reach the limited functionality needed
    to verify their address or request another email.
-   [x] Keep existing admin accounts verified during the schema upgrade.

------------------------------------------------------------------------

## Stage 4 -- React Email templates

Suggested backend structure:

``` text
emails/
├── components/
│   ├── EmailLayout.tsx
│   ├── EmailHeader.tsx
│   └── EmailFooter.tsx
│
├── templates/
│   └── VerifyEmail.tsx
│
└── emailService.tsx
```

-   [x] Create a shared email layout.
-   [x] Incorporate Crafty Keepsakes branding and brand colours.
-   [-] Create `VerifyEmail.tsx`.
-   [-] Include a personalised greeting.
-   [-] Include a prominent verification button using the supplied
    verification URL.
-   [-] Include the 24-hour expiry information.
-   [x] Explain what to do if the recipient did not create an account.
-   [x] Ensure the email has a useful plain-text alternative.
-   [-] Test rendering and delivery in Gmail and Outlook, on desktop and
    mobile.

Keep email templates in the backend or a shared package. Do not bundle
Resend credentials or server-only email functionality into the Vercel
frontend.

------------------------------------------------------------------------

## Stage 5 -- React frontend implementation

### 5.1 Registration flow

-   [x] Update registration success handling.
-   [x] Display a message explaining that email verification is
    required.
-   [x] Display the email address the verification message was sent to,
    where appropriate.
-   [x] Provide an option to resend the verification email.
-   [x] Handle the case where account creation succeeds but email
    delivery is temporarily unavailable.

### 5.2 Verification page

Create a React route:

``` text
/verify-email
```

-   [x] Extract the token from the query string.
-   [x] Submit the token to `POST /api/v2/auth/verify-email`.
-   [x] Display a loading state while verification is processed.
-   [x] Display successful verification.
-   [x] Display expired or invalid-link messages.
-   [x] Handle already-verified accounts.
-   [x] Remove the token from the visible URL and browser history after
    extracting it.
-   [x] Avoid loading third-party analytics or scripts while the token
    remains in the URL.
-   [x] Provide a route back to login.

### 5.3 Unverified-account experience

-   [x] Create a clear verification-required message at login.
-   [x] Explain that the account needs email verification.
-   [x] Provide a resend-verification action.
-   [x] Display resend cooldown and success/failure feedback.
-   [x] Ensure the user can still access the verification flow without
    being trapped by protected-route redirects.

### 5.4 Redux and route protection

-   [ ] Extend the existing Redux authentication state if necessary to
    include `email_verified`.
-   [x] Keep login and `/auth/me` response handling aligned with the
    signed user payload.
-   [x] Rely on the backend login and middleware checks for access
    enforcement rather than frontend checks alone.
-   [x] Do not rely on frontend checks alone; the Express backend must
    enforce access restrictions.
-   [x] Preserve existing role-based customer/admin permissions.

------------------------------------------------------------------------

## Stage 6 -- Testing and deployment

### 6.1 Backend testing

-   [ ] Successful registration and email delivery.
-   [ ] Token generation and SHA-256 hashing.
-   [ ] Successful verification.
-   [ ] Expired verification token.
-   [ ] Invalid verification token.
-   [ ] Reuse of an already-used token.
-   [ ] Verification of an already-verified account.
-   [ ] Resending a verification email.
-   [ ] Previous token invalidation after resend.
-   [ ] Rate limiting and resend cooldown.
-   [ ] Database transaction rollback on failure.
-   [ ] Email provider outage handling.
-   [ ] Generic responses for unknown email addresses.

### 6.2 Frontend testing

-   [ ] Successful verification from an email link.
-   [ ] Expired-link experience.
-   [ ] Invalid-link experience.
-   [ ] Already-verified account experience.
-   [ ] Resend functionality and cooldown.
-   [ ] Unverified-account access restrictions.
-   [ ] Existing admin login and access.
-   [ ] Correct Redux state after login and verification.
-   [ ] Correct behaviour when the API is unavailable.

### 6.3 Security checks

-   [ ] Rate-limit registration, resend and verification endpoints.
-   [ ] Never log raw verification tokens.
-   [ ] Store only token hashes.
-   [ ] Ensure tokens are single-use and expire.
-   [ ] Enforce verification on protected backend routes.
-   [ ] Confirm users cannot change their own verification status
    through ordinary profile-update endpoints.
-   [ ] Ensure admin accounts remain accessible after migration.
-   [ ] Check Cloudflare WAF rules do not block legitimate verification
    requests.
-   [ ] Confirm HTTPS is enforced for the website and API.
-   [ ] Review token handling, browser history and referrer exposure.

### 6.4 Deployment

-   [ ] Back up the production database before applying migrations.
-   [ ] Apply the users-table migration.
-   [ ] Manually mark existing administrative accounts as verified.
-   [ ] Create the verification-token table.
-   [ ] Deploy backend changes to Railway.
-   [ ] Configure production environment variables.
-   [ ] Deploy frontend changes to Vercel.
-   [ ] Run an end-to-end production registration test.
-   [ ] Confirm email delivery and verification work from start to
    finish.
-   [ ] Confirm existing admin accounts can still log in and use the
    application.

------------------------------------------------------------------------

## Implementation milestones

### Milestone 1 -- Infrastructure ready

-   [ ] Resend account and sending domain configured.
-   [ ] Cloudflare DNS authentication records configured.
-   [ ] Railway environment variables configured.
-   [ ] MySQL migration completed.
-   [ ] Existing admin users manually marked as verified.

**Outcome:** The email provider, domain and database are ready.

### Milestone 2 -- Backend functional

-   [ ] Token generation and storage working.
-   [ ] Email delivery working.
-   [ ] Registration integrated.
-   [ ] Verification endpoint working.
-   [ ] Resend endpoint working.
-   [ ] Backend access restrictions implemented.

**Outcome:** The complete verification process works through the API.

### Milestone 3 -- Frontend integrated

-   [ ] Registration messaging updated.
-   [ ] Verification page implemented.
-   [ ] Resend functionality implemented.
-   [ ] Redux state updated.
-   [ ] Route protection updated.

**Outcome:** Customers can register, receive an email and verify their
accounts.

### Milestone 4 -- Production ready

-   [ ] Backend and frontend tests completed.
-   [ ] Security checks completed.
-   [ ] Railway and Vercel deployments completed.
-   [ ] End-to-end production test successful.

**Outcome:** Email verification is ready for public customer
registration.

------------------------------------------------------------------------

## Key architectural decisions

  Area                          Decision
  ----------------------------- -----------------------------------------
  Email provider                Resend
  Sending domain                `craftykeepsakes.uk`
  Sending address               `verify@craftykeepsakes.uk`
  Email templates               React Email
  Email delivery                Resend HTTPS API called by Express
  Token generation              Node.js `crypto.randomBytes(32)`
  Token storage                 SHA-256 hash in MySQL
  Token expiry                  24 hours
  Token use                     Single-use
  Verification status           `users.email_verified`
  Verification timestamp        `users.email_verified_at`
  Verification endpoint         `POST /api/v2/auth/verify-email`
  Resend endpoint               `POST /api/v2/auth/resend-verification`
  Frontend verification route   `/verify-email`
  Existing accounts             Manually migrated as verified admins

**Guiding principle:** Registration creates the account, verification
confirms ownership of the email address, and
authentication/authorisation controls access. Keep those
responsibilities separate and keep all verification decisions enforced
by the Express backend.
