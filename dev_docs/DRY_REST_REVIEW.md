# DRY, REST, SOLID and YAGNI review

Reviewed: 16 November 2026

This is a review of selected client and server code, not an exhaustive audit. No
application behavior was changed. DRY means keeping each business rule in one
authoritative place; it does not mean removing every similar-looking line. REST
is a set of design principles, so the suggestions below are improvements, not a
claim that every existing action-style endpoint is inherently wrong.

SOLID is a set of guidelines for keeping responsibilities and dependencies
manageable. YAGNI means "You Aren't Gonna Need It": avoid maintaining features
or flexibility without a current need. Neither requires adding interfaces or
removing working features simply to follow a rule.

The additional structure review considers separation of concerns, feature
organization, a single source of truth, simplicity and consistent conventions.
It is a targeted review rather than an inventory of every file or dependency.

## Highest-priority findings

### 1. Sale price calculations can disagree

**DRY:** The sale calculation is repeated in the
[product list](../client/src/features/products/page.tsx#L31),
[product details](../client/src/features/products/view-details/page.tsx#L24),
[landing page](../client/src/features/landingPage/page.tsx#L45) and
[product card](../client/src/features/landingPage/components/ProductCard.tsx#L24).
The [server basket](../server/src/routes/v2/basket.ts#L60) calculates it again
and rounds the unit price before multiplying by quantity. The
[product details total](../client/src/features/products/view-details/page.tsx#L173)
multiplies the unrounded price first.

For example, six items at £1.99 with 10% off display **£10.75** in the product
details, but the basket calculates **£10.74**. This example was checked with the
current JavaScript calculations; no end-to-end payment was performed.

**Suggested follow-up:** Agree the rounding rule, keep the server authoritative
for what is charged, and use one client-side pricing helper for display. Add
tests for fractional-penny discounts and quantities greater than one. Avoid
changing existing order or invoice snapshots.

### 2. Account validation rules are not consistent

**DRY:** [Registration](../server/src/routes/v2/auth.ts#L277) checks email format
and an eight-character minimum password, while
[admin user creation](../server/src/routes/v2/users/create/handler.ts#L23) checks
only that the fields are present. The
[user update](../server/src/routes/v2/users/update/handler.ts#L82) accepts
provided email and password values without those checks. Client forms also
validate independently. The server has a
[password validator](../server/src/ts-common/validators.ts#L105) with stricter
rules than registration, so using it unchanged would alter the current policy.

**Suggested follow-up:** Agree the account rules first, then use shared server
validation for registration, admin creation and account updates where the same
rules are intended. Keep client validation for immediate feedback, but do not
rely on it to enforce server rules. Add tests for each entry point and any
intentional differences.

### 3. Checkout can change the database schema

**DRY and reliability:** The invoice address columns are defined in the
[schema](../server/scripts/migrations/phase1_schema_v2.sql#L191), but checkout
also checks for and adds them in
[basket.ts](../server/src/routes/v2/basket.ts#L129). If columns are missing,
the `ALTER TABLE` runs after checkout has started a transaction
([checkout](../server/src/routes/v2/basket.ts#L787)). MySQL DDL can implicitly
commit, so rollback may not behave as intended on an older database.

**Suggested follow-up:** Verify all deployed databases have the columns; move
any needed upgrade into the schema migration process before removing the
request-time fallback. Test both a fresh database and an older schema, including
a checkout failure and rollback. Do not remove the fallback until the migration
has been verified.

## Further DRY opportunities

### 4. Email validation is repeated on the server

The same email pattern appears in
[auth](../server/src/routes/v2/auth.ts#L102),
[contact](../server/src/routes/v2/contact.ts#L7) and the existing
[shared validator](../server/src/ts-common/validators.ts#L96). The client has
its own [email helper](../client/src/helpers/userValidation.ts#L1), which is
appropriate for immediate feedback but could drift from the server.

**Suggested follow-up:** Reuse the server helper where the format rule is meant
to match, and test client/server examples together. Keep context-specific rules,
such as whether email is optional and its length limit, separate.

### 5. Product category updates repeat the same database steps

[Product creation](../server/src/routes/v2/products/create/handler.ts#L53) and
[product update](../server/src/routes/v2/products/update/handler.ts#L103) both
create or find categories and link them to the product. A change to category
handling must currently be made in both places.

**Suggested follow-up:** Extract the shared category-linking operation, passing
the existing transaction connection. Keep update's removal of old links
explicit. Test creation, replacement, duplicate categories and rollback.

### 6. Audit actor extraction is duplicated

Product and user handlers repeatedly derive the actor's ID and role before
writing an audit event; compare
[product creation](../server/src/routes/v2/products/create/handler.ts#L72) with
[user creation](../server/src/routes/v2/users/create/handler.ts#L81). Reviews
already have a [small helper](../server/src/routes/v2/reviews/shared/helpers.ts#L4)
for the same purpose.

**Suggested follow-up:** Consider moving the existing helper to a shared server
location and using it where its behavior matches. Preserve audit contents and
authentication checks; do not make a broad middleware rewrite just for DRY.

## REST and API contract observations

### 7. A basket GET creates a basket

`GET /api/v2/basket` calls
[`ensureActiveBasket`](../server/src/routes/v2/basket.ts#L206), which inserts a
basket when none exists. GET requests should normally be safe to repeat without
creating a business resource; browsers, monitoring tools and retries can make
GET requests unexpectedly.

**Suggested follow-up:** Consider returning an empty basket without creating a
row, then create it when adding an item. Check callers and tests first. The
invoice GET also [records a view](../server/src/routes/v2/basket.ts#L408);
decide whether that tracking should remain an incidental side effect or become
an explicit action, since it affects the “new” indicator.

### 8. Product reads have different response shapes

The [product list](../server/src/routes/v2/products/get/handler.ts#L9) returns a
parsed result object whose `data` is still JSON text. The
[single-product route](../server/src/routes/v2/products/get-by-id/handler.ts#L7)
returns raw database rows containing another JSON string. The
[client](../client/src/store/products/productsThunks.ts#L46) must parse several
layers. A missing product currently returns **200** with an empty result, as
documented by the [existing test](../server/src/routes/v2/products/read.handlers.test.ts#L118).

**Suggested follow-up:** Define a consistent JSON contract: a collection with an
array of products, and a single product object or `404` when it does not exist.
Update clients and contract tests together; this is a breaking change and
should be introduced with a compatibility plan.

### 9. Product filtering has two overlapping endpoints

Both [`GET /products`](../server/src/routes/v2/products/get/handler.ts#L9) and
[`GET /products/filter`](../server/src/routes/v2/products/get-filtered/handler.ts#L9)
pass query parameters to the same query builder, but the filtered handler also
has extra image parsing. The client currently
[calls `/filter`](../client/src/store/products/productsThunks.ts#L184).

**Suggested follow-up:** Decide on one filtering contract, preferably query
parameters on the product collection, and share response normalization. Retain
the existing route as an alias until callers have migrated and its behavior has
been compared with the collection route.

### 10. Partial updates use PUT

The [product](../server/src/routes/v2/products/update/handler.ts#L44),
[user](../server/src/routes/v2/users/update/handler.ts#L32) and
[review](../server/src/routes/v2/reviews/update/handler.ts#L13) handlers accept
partial fields using `PUT`. `PATCH` would more clearly communicate partial
updates; this is a contract-design issue rather than proof the current endpoints
are broken.

**Suggested follow-up:** Document the existing behavior now. If consistent
resource semantics are desired, add and test `PATCH` routes alongside the
existing `PUT` routes before migrating clients.

### 11. Orders and invoices are nested under the basket

Order and invoice reads are exposed under
[`/basket/orders` and `/basket/invoices`](../server/src/routes/v2/basket.ts#L236),
although they remain meaningful after the basket is checked out. Payment actions
also use a different [payments path](../server/src/routes/v2/payments.ts#L99).
This makes resource discovery less consistent; action endpoints such as
checkout and webhooks can still be reasonable.

**Suggested follow-up:** Consider dedicated `/orders`, `/invoices` and
invoice-payment resources in a future API version. Preserve the existing
ownership and admin checks, and keep aliases until clients are migrated.

### 12. The endpoint inventory is incomplete

The [endpoint inventory](../server/src/endpoint-inventory.ts#L4) covers only
auth, products, users, audit and basket, while
[app.ts](../server/src/app.ts#L107) also mounts blog, notifications, reviews,
reports, payments and contact routes. The inventory can therefore give an
incomplete picture of API coverage.

**Suggested follow-up:** Expand the inventory and its tests, or document its
limited scope. If it becomes the API contract, keep route definitions, client
usage and the inventory checked together to prevent drift.

## SOLID observations

### 13. Basket and blog code have several responsibilities

**Single responsibility:** [basket.ts](../server/src/routes/v2/basket.ts#L206)
handles basket items, orders, invoices and checkout, including database queries,
payments and notifications. The client
[blog page](../client/src/features/blog/page.tsx#L195) handles loading, creating
posts, comments, reactions and display state. Length alone is not a problem, but
changes to these different features require working in the same large files.

**Suggested follow-up:** When changing these areas, consider separating one
coherent responsibility at a time, such as checkout from basket reads, or blog
API calls from the page. Preserve transaction boundaries, permissions and
existing tests; do not split files merely to reduce their line count.

### 14. Image storage backends do not clean up in the same way

**Substitution:** The same
[image storage engine](../server/src/ts-common/image-storage.ts#L79) writes
either to local disk or to object storage. Its
[`_removeFile`](../server/src/ts-common/image-storage.ts#L114) removes local
files but does nothing for object-storage uploads. When Multer cleans up after a
failed multipart upload, objects already uploaded to the bucket can therefore
be left behind. Separately, a
[product upload](../server/src/routes/v2/products/images/uploadImages/handler.ts#L25)
can finish uploading before the handler discovers that the product does not
exist; that later failure needs its own cleanup consideration for both backends.

**Suggested follow-up:** Define and test cleanup behavior for both backends,
including partial uploads and failures after upload. Track the object key needed
for deletion, report cleanup errors, and avoid deleting files already referenced
by successful requests. Verify with a test bucket before using it in production.

### 15. Payment provider contract could be checked more consistently

**Substitution:** Both providers implement
[`PaymentProvider`](../server/src/payments/types.ts#L29), whose webhook result
uses a defined set of statuses. The
[Square provider](../server/src/payments/squareProvider.ts#L78) maps its statuses
to that set, but the
[mock provider](../server/src/payments/mockProvider.ts#L30) accepts any truthy
status and casts it to the shared type. Normal mock checkout creates valid
statuses, and the mock is blocked in production, but unusual test payloads can
produce results that do not match the contract.

**Suggested follow-up:** Validate mock event statuses and add focused tests for
valid and invalid events across both providers. Keep each provider's different
signature and payload format; substitutability does not mean they must accept
the same raw webhook.

### 16. Payment services are tied to concrete dependencies

**Dependency inversion:** The
[payment service](../server/src/payments/service.ts#L21) obtains the configured
provider itself and imports the database directly. This works, but makes it
harder to test its business decisions without replacing module-level
dependencies. The Square provider already accepts a
[fetch function](../server/src/payments/squareProvider.ts#L91) for tests.

**Suggested follow-up:** If payment testing or provider changes become harder,
consider passing the required provider and database operations into the
payment workflow. Keep the existing transaction and error behavior. A small
function parameter can be enough; a repository framework is not required.

### 17. Extensibility is useful only where it serves a need

**Open/closed and interface segregation:** The small
[payment provider interface](../server/src/payments/types.ts#L29) serves two
real implementations: Square and a mock. Adding a provider currently requires
editing the [factory](../server/src/payments/index.ts#L14), which is reasonable
for a small, known set of providers. The interface contains only the operations
the current payment workflow needs.

**Suggested follow-up:** Keep the existing boundary and test each provider
against its contract. Do not add a plugin system or split the interface unless
a real provider or caller needs it. No clear interface-segregation problem was
confirmed in the reviewed payment interface.

## YAGNI observations

### 18. API version flags need a decision

[README](../README.md#L100) says per-domain flags select legacy or v2. However,
[`resolveApiVersion`](../client/src/api/apiVersion.ts#L5) returns `v2` for every
input, and ordinary
[`buildApiUrl`](../client/src/api/apiPath.ts#L61) calls use it when a domain
flag is not `v2`. An explicit version argument can still select `v1`, and the
server deliberately supports both URL prefixes. The per-domain legacy setting
therefore does not appear to perform the selection described by the README.

**Suggested follow-up:** Agree whether per-domain legacy selection is still
needed. If it is, correct it and test both choices; if not, simplify the
switchboard and update the documentation. First check deployed settings and
external clients. Do not remove the server's `/api` aliases as part of this
cleanup without a separate compatibility plan.

### 19. Some shared validators have no in-repository callers

[`normalizeText`, `validateEmail` and `validatePassword`](../server/src/ts-common/validators.ts#L58)
are exported, but a search of the client and server source found no callers.
The password helper also describes stricter rules than registration currently
enforces. Unused code can suggest that a policy is enforced when it is not.

**Suggested follow-up:** First settle the validation policy described in finding
2. Then reuse helpers that implement the agreed rules or remove genuinely
unused ones after checking external consumers and tests. Do not activate the
stricter password policy by accident.

### 20. Future notification channels are a conscious trade-off

The [notification service](../server/src/notifications/service.ts#L8) has a
channel interface and loop, but currently registers only the in-app channel.
The [types](../server/src/notifications/types.ts#L89) mention email as a future
channel. This is a small amount of extra flexibility, not proof that the design
is wrong or that an email channel should be built now.

**Suggested follow-up:** Confirm whether a second channel is planned and useful.
Keep the current design if it helps that work; otherwise consider simplifying
it when the notification service next changes. Preserve delivery and error
handling either way.

The mock payment provider supports testing, and both API prefixes are retained
for compatibility; they should not be removed simply because they add code.
Review actual usage and migration needs first.

## Structure, simplicity and consistency observations

### 21. Put shared UI in a clearly shared location

**Feature boundaries:** [ActionButton](../client/src/features/landingPage/components/ActionButton.tsx)
lives under `landingPage`, but it is also used by
[contact](../client/src/features/contact/page.tsx#L6),
[payments](../client/src/features/payments/resultPage.tsx#L5) and
[navigation](../client/src/components/header/header.tsx#L15), among other
features. Its location makes a shared component look like it belongs only to
the landing page.

**Suggested follow-up:** Consider moving it to a shared components folder when
working on the UI, updating imports and tests together. Preserve its appearance
and behavior. Only move components that are genuinely shared.

### 22. Feature code is organized in several different ways

**Feature organization:** Client pages live in `features/`, while some of their
state and API calls live in `store/`: for example, the
[basket page](../client/src/features/basket/page.tsx) uses
[basket thunks](../client/src/store/basket/basketThunks.ts), while
[blog API calls](../client/src/features/blog/page.tsx#L216) are in the page.
On the server, [products](../server/src/routes/v2/products.ts) has separate
handler folders, while [basket](../server/src/routes/v2/basket.ts) and
[blog](../server/src/routes/v2/blog.ts) use larger route files.

These approaches can all work, but the differences make it harder to predict
where to look. This overlaps with finding 13; it is not a request for a
wholesale rewrite.

**Suggested follow-up:** Agree on a lightweight convention for where feature
pages, API calls, server handlers and their tests belong. Apply it when a
feature is already being changed. Keep truly shared code in shared locations,
and avoid moving unrelated files just for consistency.

### 23. Failed requests can look like empty data

**Consistent error handling:** [Loading all users](../client/src/store/users/usersThunks.ts#L29)
does not check the HTTP status and returns an empty list for a non-array
response. A server error represented as an object can therefore look like
“no users”. The
[notification API](../client/src/features/notifications/api.ts#L14) returns
zero unread notifications on an unsuccessful response, and returns an empty
list for malformed JSON. By contrast, the
[payment API](../client/src/features/payments/paymentsApi.ts#L12) reports
request failures.

**Suggested follow-up:** Define when a feature should display an error, retain
previous data, or continue without blocking the page. Check HTTP status and
unexpected response shapes; don't turn failures into successful empty results
without an explicit product decision. Add focused tests for network failures,
server errors and malformed responses. Avoid a one-size-fits-all request
framework if a small shared error helper is sufficient.

### 24. Product image data has more than one shape

**Single source of truth:** The client
[`Product` type](../client/src/types.ts#L33) describes `images` as a string,
but the [product fetch](../client/src/store/products/productsThunks.ts#L46)
parses it into an array, and the
[product card](../client/src/features/landingPage/components/ProductCard.tsx#L26)
handles both shapes. The
[product page](../client/src/features/products/page.tsx#L64) has another image
parser. This is connected to the API response-shape issue in finding 8.

**Suggested follow-up:** Agree on the API shape and normalize it once at the
client boundary, so components receive a correctly typed image array. Model
create/update inputs separately if their needs differ. Keep compatibility with
existing server responses during the transition; sharing a type alone does not
validate data received over the network.

### 25. The blog count loads more data than it needs

**Separation of concerns and simplicity:** The
[navigation bar](../client/src/components/header/nav.tsx#L47) requests all blog
posts to count unread ones. The
[home page](../client/src/features/landingPage/page.tsx#L130) and
[blog page](../client/src/features/blog/page.tsx#L216) also request the posts.
The [server response](../server/src/routes/v2/blog.ts#L90) loads images,
comments, reaction counts and, for signed-in users, view information for each
post. This can create repeated requests and database work as the blog grows.

**Suggested follow-up:** Measure requests and query counts first. If this
becomes costly, consider a small unread-count query or a shared client data
source, and batch related server queries where appropriate. Preserve per-user
unread behavior, refresh after views, and existing access checks; don't add a
cache without deciding how it stays up to date.

### 26. Image storage can silently fall back to local disk

**Explicit configuration:** [Image storage configuration](../server/src/ts-common/image-storage.ts#L25)
returns no object-storage configuration if any required setting is missing.
The [upload engine](../server/src/ts-common/image-storage.ts#L83) then writes
to local disk. Local storage is useful for development, but an incomplete
production configuration could appear to accept uploads while not using the
intended bucket.

**Suggested follow-up:** Make the storage choice explicit and report incomplete
production configuration instead of silently switching backends. Preserve
intentional local development and existing images, and test missing settings,
successful uploads and failure reporting before changing deployment behavior.
This is separate from the cleanup issue in finding 14.

### 27. Make package-manager ownership clear

**Repository conventions:** There are separate
[client](../client/package.json), [server](../server/package.json) and
[root](../package.json) manifests. The root and server have both npm and Yarn
lockfiles, while [CI](../.github/workflows/ci.yml#L21) and the
[server Docker build](../server/Dockerfile#L4) use npm. Multiple lockfiles can
make it unclear which dependencies are authoritative; this review did not
establish whether another workflow still needs Yarn or the root manifest.

**Suggested follow-up:** Document which package manager and lockfiles are
supported for each part of the repository. Check local and deployment workflows
before removing or changing any manifest or lockfile. Do not mix package-manager
changes with unrelated feature work.

## What already aligns well

- Server and client already have shared validation helpers, even though not all
  matching rules use them.
- Product and user creation use `201`, and several detail endpoints return
  `404` for missing resources. Authentication and role checks are centralized
  in [middleware](../server/src/ts-common/middleware.ts).
- [API path construction](../client/src/api/apiPath.ts) is centralized on the
  client, and both `/api` and `/api/v2` are deliberately mounted to the same
  routers for compatibility. Do not remove either prefix solely to reduce
  duplication.

## Suggested order

1. Agree and test price rounding and account validation.
2. Review image storage configuration and cleanup, and verify schema migration
   coverage before changing upload or checkout behavior.
3. Address misleading empty results and agree the product data contract.
4. Extract small, behavior-preserving shared helpers and improve payment tests.
5. Agree repository conventions and decide whether the legacy API flags and
   unused validators are still needed.
6. Document API contracts, then introduce any route or response changes
   gradually with tests and backward compatibility.
