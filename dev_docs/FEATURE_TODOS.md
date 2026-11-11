# Next Features / Changes

Purpose: Document new/next features and improvements to ensure the requirements and comments from the user are captured when using an agent to support development.

# How to use this file

-   Add new features to the Feature Section, it needs to contain:
    -   Title
    -   User Story

-   Add Changes to the Change Section, each item needs to contain:
    -   Title
    -   Type [Bug, Enhancemment, Missing Criteria]
    -   User Story


# Decision Log

# Annoying issues

-   because the dev branch is always open any new branches inherit the first 7 commits, so the history looks a bit messy - is there a way to address this?

## Features

-   [x] CKS-2-006 : Introduction of  User Notifications (Next Priority)
    -   AS a Customer, WHEN my order is updated, I WANT to get a notidication advising me of the changes.
    -   AS an ADMIN, WHEN a CUSTOMER places an order, I WANT to get a notification advising me so that i can begin processing.
    -   AS an POST Author, I WANT a notification, WHEN a post has been reacted to OR when a comment has been added that was not by me.

-   [x] CKS-2-022 : Add, Update, Delete customer reviews
    -   AS a Customer, WHEN viewing the Reviews page, I WANT to see feedback from other clients.
    -   AS an ADMIN, I WANT to add, update and delete feedback gathered from external sources (stored in `reviews_v2`) so it can be shared with customers.
    -   Notes: The admin Reports area was replaced by Reviews. Report export (XLSX/CSV) will be tackled separately with a different approach.

-   [x] CKS-2-023 : "My invoices" page in the profile menu
    -   AS a CUSTOMER, WHEN I open the profile menu, I WANT a "My invoices" option that takes me to a dedicated invoices page.
    -   AS a CUSTOMER, WHEN viewing my profile, I WANT it to focus on my account details, with the invoice table no longer shown there.
    -   AS an ADMIN, I WANT a "Reporting" page in the main navigation (admins only) with a link to an all-invoices page, so I can see every customer's invoices and update status and tracking.
    -   Notes: Invoice components now live in `features/invoices/`. Routes: `/invoices` (own invoices), `/Reporting` and `/Reporting/invoices` (admin only). The all-invoices list is served by the admin-only `GET /api/v2/basket/orders/all`. Report export (XLSX/CSV) is still a separate, later piece of work.

-   [x] CKS-2-024 : Admin reports for monitoring the shop
    -   AS an ADMIN, I WANT to run product reports (e.g. volumes sold over a period, best and slowest sellers) so I can see what to promote, restock or make.
    -   AS an ADMIN, I WANT to run user activity reports and see customers who have not logged in for some time, so I can spot dormant accounts.
    -   AS an ADMIN, I WANT to see blog stats (e.g. views, comments, most engaged posts) so I can see what content works.
    -   AS an ADMIN, I WANT to filter reports by date range, and export them to XLSX or CSV so the export reflects the filtered view.
    -   Notes: Lives on the admin-only Reporting page (`/Reporting`), alongside the existing "All invoices" link. Will need the login flow to record `users_v2.last_login_at` (the column exists but nothing writes to it yet), and server-side report endpoints since the data is aggregated across tables. Export was split out of CKS-2-022 and is covered here.
    -   Built: admin-only `GET /api/v2/reports/{products,users,blog}` with `from`/`to` (YYYY-MM-DD, inclusive) filters, and `inactiveDays` for users. Client pages at `/Reporting/products`, `/Reporting/users` and `/Reporting/blog`, each with date filters and CSV export of the filtered view. Login now writes `users_v2.last_login_at`; accounts with no login recorded are measured from their registration date. XLSX export is not built yet (CSV opens in Excel); it would need a spreadsheet library.

-   [ ] CKS-2-025 : IMPORTANT - Integrate a payments vendor
    -   AS a CUSTOMER, WHEN I check out, I WANT to pay securely online so that my order is confirmed once payment is taken.
    -   AS an ADMIN, WHEN a payment is taken, I WANT the invoice to be marked as paid automatically, so I don't have to update it by hand.
    -   Notes: High priority. Today checkout creates the order and an `unpaid` invoice and an admin sets the status manually, so no money is actually taken. Vendor not chosen yet (e.g. Stripe, PayPal, Square). Things to decide and cover: use the vendor's hosted checkout so card details never touch our servers; confirm payment through a signed webhook rather than trusting the browser; keep orders pending until payment succeeds; handle failed, abandoned and refunded payments; store the vendor's payment reference on the invoice; notify the customer and admins on payment; keep secrets in environment config only; add tests for the webhook (including signature rejection and duplicate events).
    -   Foundation built (mock provider): `PAYMENTS_PROVIDER=mock` enables a provider-neutral flow in `server/src/payments/`. Checkout returns a `payment_url`, orders stay `pending` until a signed webhook event marks the invoice paid (events de-duplicated, amount checked, audited, customer and admins notified). A simulated payment page lives at `/payments/mock` and a result page at `/payments/result`. Square provider built (Payment Links, `x-square-hmacsha256-signature` verification, `payment.updated` mapping); sandbox payments and webhooks have been tested locally and on dev. Still to do: refunds (`refund.updated`), going live (see README, "Going live"), and deciding when to remove the mock path.

-   [ ] CKS-2-021 : Low stock notifications for ADMINS
    -   AS an ADMIN, WHEN a product's stock runs low or out, I WANT to get a notification so that I can restock or make more.
    -   Notes: Parked. Many products are hand crafted and may be made on an order-by-order basis, so a quantity of 0 is not necessarily a problem. Stock is also not currently reduced at checkout. Needs a per-product "made to order" flag (to exclude those from alerts), stock decrement on checkout, and a de-duplicated alert (once per threshold crossing, not on every order). A previous implementation used a threshold of 5 (and 0 for out of stock) and was removed.

-   [x] CKS-2-027 : Emailing from the portal
    -   AS a CUSTOMER when i register for a user account, I WANT an EMAIL with a a VERIFY link to activate my account
    -   AS an ADMIN, I WANT to put an extra layer of security onto my uder resitration journey AND restrict login UNTIL the user has verified their email address.
    -   AS an ADMIN, I WANT the email feature to be scalable so it can but used for INVOICES, NOTIFICATION and NEWSLETTERS so should support a multi template modal.
    - Notes: Registration verification is implemented with Resend email templates, hashed 24-hour single-use tokens, resend cooldown/rate limiting, customer-facing verification states, and automated tests. Dev email delivery has been verified. Future invoice/notification/newsletter templates remain open.


## Enhancements

-   [x] CKS-2-007 : Add Delivery tracking to the invoices
    -   AS a CUSTOMER, WHEN my order has been dispatched, I WANT to see my tracking details.
    -   AS an ADMIN, WHEN I ship an order, I WANT to be able to add the tracking details to the CUSTOMERS invoice.

-   [x] CKS-2-008 : Add Billing address details to the Invoices
    -   AS an ADMIN, WHEN a CUSTOMER places an order, I WANT to be able to see both the BILLING ADDRESS and the DELIVERY ADDRESS.

-   [x] CKS-2-011 : Add images to the onSale items scrolling on the landing page
    -   AS a CUSTOMER, WHEN I am on the landing page, I WANT to see the thumbnail of the products that are onSale.

-   [x] CKS-2-012 : Add sale %, Price before and Price after to the scrolling onSale tiles of on the landing page
    -   AS a CUSTOMER, WHEN I am on the landing page, I WANT to see the reduction %, the original price (striked through) and the reduced price.

-   [x] CKS-2-015 : Add navigation arrows to onSale items on landng page.
    -   AS a CUSTOMER, WHEN I am on the landing page AND viewing the onSale items, I WANT to be able to skip forward or backwards through them items.

-   [ ] CKS-2-016 : Add in a 'Delete Comment' to the blog feature
    -   AS an ADMIN user, WHEN someone leaves a comment on a blog post, I WANT to be able to remove the comment.

-   [x] CKS-2-017 : Add in a 'NEW Post' flag to the blog feature
    -   AS an ADMIN user, WHEN I make a new post, THEN there should be a 'NEW' label for the users to see.
    -   AS a CUSTOMER, WHEN a new blog is posted, THEN there should be a DOT on the Blog Menu AND THEN the post should have a 'NEW' label.

-   [x] CKS-2-018 : Move Invoice feature into its own component
    -   AS a DEVELOPER, WHEN I come to make changes to the Invocies feature, I WANT to be able to quickly identify the Invoices component.

-   [x] CKS-2-026 : Update User profile actions panel

-   [ ] CKS-2-029 : contact us form for any anyone that sends from the app to craftykeepsakesprints@gmail.com
    -   AS a CUSTOMER I NEED to be able to submit a form to contact the craftykeepsakes team WITHOUT having to be a logged in user.
    -   AS an ADMIN I WOULD like some restrictive measures put in place to prevent bots and spam for example a user cannot submit more than one contact within 24hours

-   [ ] CKS-2-030 : logged in users can add a review to a product, products should also display the feedback provided.
    -   AS a CUSTOMER I WANT to be able to provide feedback (good and bad) for a product i have purchased
    -   AS an ADMIN I WANT to be able to reply to feedback on products AND have the right to delete user submissions
    -   AS an APPLICATION ONLY users that are verified and logged in are permitted so submit a review

-   [ ] CKS-2-031 : Changes to how Quantity is managed
    -   AS a CUSTOMER when updating how many of the item i need, I DONT WANT to have to click '+' multipe times, there should be a text box to allow me to type how many i want and the price should reflect this new quantity.
    -   AS a CUSTOMER before adding an item to the basket, i should be able to define the quantity i want beforehand.

-   [ ] CKS-2-032 : New Product Quantity
    -   AS an ADMIN i need to be able to add a new product and NOT have to specify a quantity since some products are not stocked they are hand crafted.   

-   [ ] CKS-2-033 : [HIGH] Setup a staging database on railway for dev instead of using the production database and move local to also use the same DB connection

## Bugs

-   [x] TotalDue on Invoice seems to be a different value to that of the product.
    -   Issue was that Tax was being applied, i have set to zero as this might still be needed in the future.

-   [x] Filters on the Admin Audit table dont seem to auto apply.

-   [x] Adding an item to the basket before logging in, then logging in to checkout seems to not work correctly.
    -   Guest basket items are synced to the account during login before the user is redirected.

-   [x] The local basket was not cleared when the server returned an empty basket.
    -   Basket hydration now replaces local items with the server basket, including when it is empty.

-   [x] Button hover and pressed styling was not being applied consistently.
    -   Button state styling is now applied through the Grommet button theme.

-   [x] Admin Audit feature, the filters only capture whats being displayed for example there a 5 rows on the first page all actions have been for POST /api/v2/basket/checkout, this means the source endpoint filter only has POST /api/v2/basket/checkout to select from, but there are another 6 pages, so there should be more endpoints listed.

-   [x] Basket isnt showing the images for the products
    -   Basket responses include the primary product image, and relative image paths use the configured API origin. Previously uploaded images still need to exist in the relevant storage.

-   [x] WHen the user logs out, they are taken to /home but the login panel still shows them as logged in until the page is refreshed
    -   Auth state now clears immediately, and in-flight session checks cannot restore a session after logout.

-   [x] Users are allowed to place an oerder without having an address on their profile or adding an override address when on the checkout screen. Need to block the checkout process if the profile address is empy and maybe add a notification in for the user to be promted to add one
    -   Checkout now requires address line 1, town and postcode, with a prompt to complete the profile address or enter an override.

## Adhoc TODOs

-   [x] Need to add in some inline validations for email, telephone number and password character requirements under the createUser form.
    -   Admin create-user form checks email format, optional telephone format and password length/matching inline. Registration checks required names, email format and password length/matching inline before submitting.

-   [x] Delete V2 User Error: Error: Cannot delete or update a parent row: a foreign key constraint fails (`CraftyKeepsakes`.`blog_post_comments_v2`,  CONSTRAINT `fk_blog_post_comments_v2_user` FOREIGN KEY (`user_id`) REFERENCES `users_v2` (`id`)) at PromisePoolConnection.query need to add a feedback mechanism for the user when deletion fails due to foreign key constraints and set the status to error with a user-friendly message, this impacts the deleterUser process.

-   [ ] Introduce a consistent API error catalog: stable codes, HTTP statuses and customer-safe messages across registration, user management, checkout and payments. Keep the existing `error` field for compatibility; document and test mappings.
    -   Started: user deletion returns `USER_NOT_FOUND`, `USER_HAS_DEPENDENCIES` or `USER_DELETE_FAILED` alongside its existing messages.

-   [ ] Add request correlation: generate a server-side request ID, return it with errors and include it in structured logs without recording credentials, payment payloads or personal data. Define a retention policy and roll out across API journeys.

-   [ ] Set up external monitoring of the public API `/health` endpoint and alerts for tunnel or API outages; decide ownership, alert destination and check frequency. Consider protected diagnostics separately. Monitor Square webhook delivery independently: API health does not prove webhook delivery.
    -   Existing `/health` checks the database and is used by Railway. It logs distinct database failure and timeout codes while returning only generic public status.

-   [x] CKS-2-013 : Make sure onSale items when added to the basket use the sale price NOT the original price?

-   [ ] Introduce a change log that is updated with the branch name and title when merging to main

-   [ ] Check to make sure the API's cant be hit externally to scrape for information

-   [ ] Revisit Test Coverage
