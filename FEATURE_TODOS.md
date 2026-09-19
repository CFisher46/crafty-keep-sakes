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

-   [ ] CKS-2-008 : Add Billing address details to the Invoices
    -   AS an ADMIN, WHEN a CUSTOMER places an order, I WANT to be able to see both the BILLING ADDRESS and the DELIVERY ADDRESS.

-   [ ] CKS-2-011 : Add images to the onSale items scrolling on the landing page
    -   AS a CUSTOMER, WHEN I am on the landing page, I WANT to see the thumbnail of the products that are onSale.

-   [ ] CKS-2-012 : Add sale %, Price before and Price after to the scrolling onSale tiles of on the landing page
    -   AS a CUSTOMER, WHEN I am on the landing page, I WANT to see the reduction %, the original price (striked through) and the reduced price.


## Bugs

## Adhoc TODOs

-   [ ] CKS-2-009 : Need to add in some inline validations for email, telephone number and password character requirements under the createUser form.

-   [ ] CKS-2-009 : Delete V2 User Error: Error: Cannot delete or update a parent row: a foreign key constraint fails (`CraftyKeepsakes`.`blog_post_comments_v2`,  CONSTRAINT `fk_blog_post_comments_v2_user` FOREIGN KEY (`user_id`) REFERENCES `users_v2` (`id`)) at PromisePoolConnection.query need to add a feedback mechanism for the user when deletion fails due to foreign key constraints and set the status to error with a user-friendly message, this impacts the deleterUser process.

-   [ ] CKS-2-009 : Look to introduce an error catalog or mapping to provide more specific error messages based on the error type or code,this impacts the deleterUser process, this impacts the deleterUser process.

-   [ ] CKS-2-010 : Improve test coverage, first phase was done under cks-2-004 

-   [ ] CKS-2-013 : Make sure onSale items when added to the basket use the sale price NOT the original price