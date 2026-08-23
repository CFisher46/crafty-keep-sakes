-- Stage 10 decommission archive script
-- Purpose: preserve legacy table data before the final removal step.
-- Safety: only run in a controlled maintenance window after confirming the runtime is v2-only.

SET FOREIGN_KEY_CHECKS = 0;

-- Rename legacy tables to archive names instead of dropping immediately.
-- Adjust the list to match the target environment if naming differs.
RENAME TABLE IF EXISTS users TO users_legacy_archive;
RENAME TABLE IF EXISTS products TO products_legacy_archive;
RENAME TABLE IF EXISTS product_images TO product_images_legacy_archive;
RENAME TABLE IF EXISTS audit_events TO audit_events_legacy_archive;
RENAME TABLE IF EXISTS baskets TO baskets_legacy_archive;
RENAME TABLE IF EXISTS basket_items TO basket_items_legacy_archive;
RENAME TABLE IF EXISTS orders TO orders_legacy_archive;
RENAME TABLE IF EXISTS order_items TO order_items_legacy_archive;
RENAME TABLE IF EXISTS invoices TO invoices_legacy_archive;
RENAME TABLE IF EXISTS invoice_items TO invoice_items_legacy_archive;
RENAME TABLE IF EXISTS customer_profiles TO customer_profiles_legacy_archive;
RENAME TABLE IF EXISTS user_roles TO user_roles_legacy_archive;

SET FOREIGN_KEY_CHECKS = 1;

-- Final manual removal step (only after data validation and rollback plan approval):
-- DROP TABLE IF EXISTS users_legacy_archive;
-- DROP TABLE IF EXISTS products_legacy_archive;
-- DROP TABLE IF EXISTS product_images_legacy_archive;
-- DROP TABLE IF EXISTS audit_events_legacy_archive;
-- DROP TABLE IF EXISTS baskets_legacy_archive;
-- DROP TABLE IF EXISTS basket_items_legacy_archive;
-- DROP TABLE IF EXISTS orders_legacy_archive;
-- DROP TABLE IF EXISTS order_items_legacy_archive;
-- DROP TABLE IF EXISTS invoices_legacy_archive;
-- DROP TABLE IF EXISTS invoice_items_legacy_archive;
-- DROP TABLE IF EXISTS customer_profiles_legacy_archive;
-- DROP TABLE IF EXISTS user_roles_legacy_archive;
