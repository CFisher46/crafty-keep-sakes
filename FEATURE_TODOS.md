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

-   [ ] Introduction of  User Notifications
    -   AS a Customer, WHEN my order is updated, I WANT to get a notidication advising me of the changes.
    -   AS an ADMIN, WHEN a CUSTOMER places an order, I WANT to get a notification advising me so that i can begin processing.


## Enhancements

-   [ ] Add Delivery tracking to the invoices [ENHANCEMENT]
    -   AS a CUSTOMER, WHEN my order has been dispatched, I WANT to see my tracking details.
    -   AS an ADMIN, WHEN I ship an order, I WANT to be able to add the tracking details to the CUSTOMERS invoice.

-   [ ] Add Billing address details to the Invoices [ENHANCEMENT]
    -   AS an ADMIN, WHEN a CUSTOMER places an order, I WANT to be able to see both the BILLING ADDRESS and the DELIVERY ADDRESS.


## Bugs

## Adhoc TODOs

[ ] Need to add in some inline validations for email, telephone number and password character requirements under the createUser form.
[ ] Delete V2 User Error: Error: Cannot delete or update a parent row: a foreign key constraint fails (`CraftyKeepsakes`.`blog_post_comments_v2`,  CONSTRAINT `fk_blog_post_comments_v2_user` FOREIGN KEY (`user_id`) REFERENCES `users_v2` (`id`)) at PromisePoolConnection.query need to add a feedback mechanism for the user when deletion fails due to foreign key constraints and set the status to error with a user-friendly message, this impacts the deleterUser process.
[ ] Look to introduce an error catalog or mapping to provide more specific error messages based on the error type or code,this impacts the deleterUser process.