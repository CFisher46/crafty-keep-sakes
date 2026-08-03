-- Phase 1 schema bootstrap
-- Creates parallel v2 tables so migration can happen incrementally with zero naming conflicts.

START TRANSACTION;

CREATE TABLE IF NOT EXISTS roles_v2 (
  id TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL,
  description VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_v2_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS users_v2 (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(320) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  status ENUM('active', 'inactive', 'locked') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_v2_email (email),
  KEY idx_users_v2_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_roles_v2 (
  user_id BIGINT UNSIGNED NOT NULL,
  role_id TINYINT UNSIGNED NOT NULL,
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id),
  KEY idx_user_roles_v2_role_id (role_id),
  CONSTRAINT fk_user_roles_v2_user FOREIGN KEY (user_id) REFERENCES users_v2(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_v2_role FOREIGN KEY (role_id) REFERENCES roles_v2(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS customer_profiles_v2 (
  user_id BIGINT UNSIGNED NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  telephone VARCHAR(30) NULL,
  address_line1 VARCHAR(255) NULL,
  address_line2 VARCHAR(255) NULL,
  address_line3 VARCHAR(255) NULL,
  town VARCHAR(120) NULL,
  county VARCHAR(120) NULL,
  postcode VARCHAR(20) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_customer_profiles_v2_user FOREIGN KEY (user_id) REFERENCES users_v2(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS categories_v2 (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(150) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_v2_slug (slug),
  UNIQUE KEY uq_categories_v2_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS products_v2 (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sku VARCHAR(64) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  is_live TINYINT(1) NOT NULL DEFAULT 0,
  on_sale TINYINT(1) NOT NULL DEFAULT 0,
  sale_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_products_v2_sku (sku),
  KEY idx_products_v2_live (is_live),
  KEY idx_products_v2_on_sale (on_sale),
  KEY idx_products_v2_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS product_categories_v2 (
  product_id BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (product_id, category_id),
  KEY idx_product_categories_v2_category (category_id),
  CONSTRAINT fk_product_categories_v2_product FOREIGN KEY (product_id) REFERENCES products_v2(id) ON DELETE CASCADE,
  CONSTRAINT fk_product_categories_v2_category FOREIGN KEY (category_id) REFERENCES categories_v2(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS product_images_v2 (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  image_path VARCHAR(1024) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_product_images_v2_product_sort (product_id, sort_order),
  KEY idx_product_images_v2_primary (product_id, is_primary),
  CONSTRAINT fk_product_images_v2_product FOREIGN KEY (product_id) REFERENCES products_v2(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS baskets_v2 (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  status ENUM('active', 'checked_out', 'abandoned') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_baskets_v2_user_status (user_id, status),
  CONSTRAINT fk_baskets_v2_user FOREIGN KEY (user_id) REFERENCES users_v2(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS basket_items_v2 (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  basket_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  quantity INT NOT NULL,
  unit_price_snapshot DECIMAL(10,2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_basket_items_v2_basket_product (basket_id, product_id),
  KEY idx_basket_items_v2_product (product_id),
  CONSTRAINT fk_basket_items_v2_basket FOREIGN KEY (basket_id) REFERENCES baskets_v2(id) ON DELETE CASCADE,
  CONSTRAINT fk_basket_items_v2_product FOREIGN KEY (product_id) REFERENCES products_v2(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS orders_v2 (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  basket_id BIGINT UNSIGNED NULL,
  order_status ENUM('pending', 'placed', 'cancelled', 'fulfilled') NOT NULL DEFAULT 'placed',
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  discount_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  tax_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  grand_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  placed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_orders_v2_user_placed (user_id, placed_at),
  KEY idx_orders_v2_status (order_status),
  CONSTRAINT fk_orders_v2_user FOREIGN KEY (user_id) REFERENCES users_v2(id) ON DELETE RESTRICT,
  CONSTRAINT fk_orders_v2_basket FOREIGN KEY (basket_id) REFERENCES baskets_v2(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS order_items_v2 (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NULL,
  product_name_snapshot VARCHAR(255) NOT NULL,
  unit_price_snapshot DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL,
  line_total DECIMAL(10,2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_order_items_v2_order (order_id),
  KEY idx_order_items_v2_product (product_id),
  CONSTRAINT fk_order_items_v2_order FOREIGN KEY (order_id) REFERENCES orders_v2(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_v2_product FOREIGN KEY (product_id) REFERENCES products_v2(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS invoices_v2 (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  invoice_number VARCHAR(50) NOT NULL,
  invoice_status ENUM('unpaid', 'paid', 'void') NOT NULL DEFAULT 'unpaid',
  issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_at DATETIME NULL,
  total_due DECIMAL(10,2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_invoices_v2_order_id (order_id),
  UNIQUE KEY uq_invoices_v2_invoice_number (invoice_number),
  KEY idx_invoices_v2_status_due (invoice_status, due_at),
  CONSTRAINT fk_invoices_v2_order FOREIGN KEY (order_id) REFERENCES orders_v2(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS invoice_items_v2 (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  invoice_id BIGINT UNSIGNED NOT NULL,
  order_item_id BIGINT UNSIGNED NULL,
  description VARCHAR(255) NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(10,2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_invoice_items_v2_invoice (invoice_id),
  KEY idx_invoice_items_v2_order_item (order_item_id),
  CONSTRAINT fk_invoice_items_v2_invoice FOREIGN KEY (invoice_id) REFERENCES invoices_v2(id) ON DELETE CASCADE,
  CONSTRAINT fk_invoice_items_v2_order_item FOREIGN KEY (order_item_id) REFERENCES order_items_v2(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payments_v2 (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  invoice_id BIGINT UNSIGNED NOT NULL,
  provider VARCHAR(80) NULL,
  provider_ref VARCHAR(120) NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_status ENUM('pending', 'succeeded', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  event_type VARCHAR(80) NOT NULL,
  metadata_json JSON NULL,
  event_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_payments_v2_invoice_event (invoice_id, event_at),
  KEY idx_payments_v2_status (payment_status),
  CONSTRAINT fk_payments_v2_invoice FOREIGN KEY (invoice_id) REFERENCES invoices_v2(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS audit_events_v2 (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_user_id BIGINT UNSIGNED NULL,
  actor_role VARCHAR(50) NULL,
  action_type ENUM('CREATE', 'UPDATE', 'DELETE', 'READ', 'LOGIN', 'LOGOUT') NOT NULL,
  resource_type VARCHAR(80) NOT NULL,
  resource_id VARCHAR(80) NULL,
  source_endpoint VARCHAR(255) NULL,
  old_values_json JSON NULL,
  new_values_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_events_v2_resource (resource_type, resource_id),
  KEY idx_audit_events_v2_actor (actor_user_id, created_at),
  KEY idx_audit_events_v2_created (created_at),
  CONSTRAINT fk_audit_events_v2_actor FOREIGN KEY (actor_user_id) REFERENCES users_v2(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO roles_v2 (code, description)
VALUES
  ('admin', 'Administrative user with platform-wide access'),
  ('customer', 'Customer account with self-service access')
ON DUPLICATE KEY UPDATE
  description = VALUES(description);

COMMIT;
