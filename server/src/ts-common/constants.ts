// User roles
export const USER_ROLE_ADMIN = 'admin';
export const USER_ROLE_CUSTOMER = 'customer';
export const USER_ROLES = [USER_ROLE_ADMIN, USER_ROLE_CUSTOMER] as const;
export type UserRole = typeof USER_ROLES[number];

// User statuses
export const USER_STATUS_ACTIVE = 'active';
export const USER_STATUS_INACTIVE = 'inactive';
export const USER_STATUS_LOCKED = 'locked';
export const USER_STATUSES = [USER_STATUS_ACTIVE, USER_STATUS_INACTIVE, USER_STATUS_LOCKED] as const;
export type UserStatus = typeof USER_STATUSES[number];

// Basket statuses
export const BASKET_STATUS_ACTIVE = 'active';
export const BASKET_STATUS_CHECKED_OUT = 'checked_out';
export const BASKET_STATUSES = [BASKET_STATUS_ACTIVE, BASKET_STATUS_CHECKED_OUT] as const;
export type BasketStatus = typeof BASKET_STATUSES[number];

// Order statuses
export const ORDER_STATUS_PLACED = 'placed';
export const ORDER_STATUS_SHIPPED = 'shipped';
export const ORDER_STATUS_DELIVERED = 'delivered';
export const ORDER_STATUS_CANCELLED = 'cancelled';

// Invoice statuses
export const INVOICE_STATUS_UNPAID = 'unpaid';
export const INVOICE_STATUS_PAID = 'paid';
export const INVOICE_STATUS_VOID = 'void';
export const INVOICE_STATUSES = [INVOICE_STATUS_UNPAID, INVOICE_STATUS_PAID, INVOICE_STATUS_VOID] as const;
export type InvoiceStatus = typeof INVOICE_STATUSES[number];

// HTTP status codes
export const HTTP_OK = 200;
export const HTTP_CREATED = 201;
export const HTTP_BAD_REQUEST = 400;
export const HTTP_UNAUTHORIZED = 401;
export const HTTP_FORBIDDEN = 403;
export const HTTP_NOT_FOUND = 404;
export const HTTP_CONFLICT = 409;
export const HTTP_INTERNAL_SERVER_ERROR = 500;

// Data source identifiers
export const DATA_SOURCE_V1 = 'v1';
export const DATA_SOURCE_V2 = 'v2';

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Audit event types
export const AUDIT_EVENT_CREATE = 'create';
export const AUDIT_EVENT_UPDATE = 'update';
export const AUDIT_EVENT_DELETE = 'delete';
export const AUDIT_EVENT_LOGIN = 'login';
export const AUDIT_EVENT_LOGOUT = 'logout';
