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

-   ALL items in progress CANNOT be marked as complete without test coverage.

# Decision Log

## Features

-   [ ] CKS-2-006 : Introduction of  User Notifications
    -   AS a Customer, WHEN my order is updated, I WANT to get a notidication advising me of the changes.
    -   AS an ADMIN, WHEN a CUSTOMER places an order, I WANT to get a notification advising me so that i can begin processing.


## Enhancements

-   [ ] CKS-2-007 : Add Delivery tracking to the invoices
    -   AS a CUSTOMER, WHEN my order has been dispatched, I WANT to see my tracking details.
    -   AS an ADMIN, WHEN I ship an order, I WANT to be able to add the tracking details to the CUSTOMERS invoice.

-   [x] CKS-2-008 : Add Billing address details to the Invoices
    -   AS an ADMIN, WHEN a CUSTOMER places an order, I WANT to be able to see both the BILLING ADDRESS and the DELIVERY ADDRESS.

-   [x] CKS-2-011 : Add images to the onSale items scrolling on the landing page
    -   AS a CUSTOMER, WHEN I am on the landing page, I WANT to see the thumbnail of the products that are onSale.

-   [x] CKS-2-012 : Add sale %, Price before and Price after to the scrolling onSale tiles of on the landing page
    -   AS a CUSTOMER, WHEN I am on the landing page, I WANT to see the reduction %, the original price (striked through) and the reduced price.

-   [ ] CKS-2-015 : Add navigation arrows to onSale items on landng page.
    -   AS a CUSTOMER, WHEN I am on the landing page AND viewing the onSale items, I WANT to be able to skip forward or backwards through them items.

-   [ ] CKS-2-016 : Add in a 'Delete Comment' to the blog feature
    -   AS an ADMIN user, WHEN someone leaves a comment on a blog post, I WANT to be able to remove the comment.

-   [ ] CKS-2-017 : Add in a 'NEW Post' flag to the blog feature
    -   AS an ADMIN user, WHEN I make a new post, THEN there should be a 'NEW' label for the users to see.
    -   AS a CUSTOMER, WHEN a new blog is posted, THEN there should be a DOT on the Blog Menu AND THEN the post should have a 'NEW' label.


## Bugs

-   [ ] TotalDue on Invoice seems to be a different value to that of the product

-   [ ] Filters on the Admin Audit table dont seem to auto apply

## Adhoc TODOs

-   [ ] CKS-2-009 : Need to add in some inline validations for email, telephone number and password character requirements under the createUser form.

-   [ ] CKS-2-009 : Delete V2 User Error: Error: Cannot delete or update a parent row: a foreign key constraint fails (`CraftyKeepsakes`.`blog_post_comments_v2`,  CONSTRAINT `fk_blog_post_comments_v2_user` FOREIGN KEY (`user_id`) REFERENCES `users_v2` (`id`)) at PromisePoolConnection.query need to add a feedback mechanism for the user when deletion fails due to foreign key constraints and set the status to error with a user-friendly message, this impacts the deleterUser process.

-   [ ] CKS-2-009 : Look to introduce an error catalog or mapping to provide more specific error messages based on the error type or code,this impacts the deleterUser process, this impacts the deleterUser process.

-   [ ] CKS-2-010 : Improve test coverage, first phase was done under cks-2-004 

-   [ ] CKS-2-013 : Make sure onSale items when added to the basket use the sale price NOT the original price? VAT somewhere maybe?

-   [ ] CKS-2-014 : Introduce a change log that is updated with the branch name and title when merging to main
