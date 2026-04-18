# Crafty Keepsakes – Server

Express + TypeScript REST API for the Crafty Keepsakes e-commerce platform. Connects to a MySQL database and serves the client application at `http://localhost:3001`.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Starts the server in development mode with `ts-node-dev`. Auto-restarts on file changes. |
| `npm run build` | Compiles TypeScript to JavaScript in the `dist/` folder via `tsc`. |
| `npm start` | Runs the compiled production build from `dist/index.js`. |
| `npm run lint` | Lints all TypeScript source files under `src/` using ESLint. |
| `npm test` | Runs the Jest test suite (passes with no tests found). |
| `npm run key:generate` | Generates a new 64-character hex AES-256-CBC encryption key and prints it to stdout. |
| `npm run key:fingerprints` | Prints fingerprints of the current and previous encryption keys for verification. |
| `npm run user:generate-insert` | Generates a ready-to-run SQL INSERT statement for a new user with encrypted PII fields. |
| `npm run repair:encrypted-users` | Dry-run: reports which user records have PII that cannot be decrypted with the current key. |
| `npm run repair:encrypted-users:apply` | Live run: re-encrypts all user PII using the current key (used after a key rotation). |

---

## Project Structure

```
src/
├── app.ts
├── index.ts
├── ts-common/
│   ├── database.ts
│   ├── helpers.ts
│   ├── middleware.ts
│   ├── sql-utils.ts
│   └── types.ts
└── routes/
    ├── audit/
    │   ├── index.ts
    │   ├── types.ts
    │   ├── get/
    │   └── post/
    ├── auth/
    │   ├── index.ts
    │   ├── get/
    │   └── post/
    ├── products/
    │   ├── index.ts
    │   ├── types.ts
    │   ├── create/
    │   ├── get/
    │   ├── get-by-id/
    │   ├── get-filtered/
    │   ├── images/uploadImages/
    │   └── update/
    └── users/
        ├── index.ts
        ├── types.ts
        ├── create/
        ├── delete/
        ├── get/
        ├── get-by-id/
        └── update/
```

---

## Root Files

| File | Description |
|------|-------------|
| `src/index.ts` | Server entry point. Imports the Express app and calls `app.listen()` on the configured port (default `3001`). |
| `src/app.ts` | Express application setup. Configures middleware (cookie-parser, CORS with credentials, JSON body parsing, static image serving) and mounts all route handlers under `/api`. |

---

## `ts-common/`

Shared infrastructure modules used across all route handlers.

| File | Description |
|------|-------------|
| `database.ts` | MySQL connection pool. Creates and exports a `mysql2/promise` connection pool using environment variables (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`). |
| `helpers.ts` | Encryption utilities. Implements AES-256-CBC `encrypt` and `decrypt` functions using `ENCRYPTION_KEY` (and optional `ENCRYPTION_KEY_PREVIOUS` for key rotation). Used to protect user PII fields at rest. |
| `middleware.ts` | Auth middleware. Exports `verifyAuthToken` — reads the `auth_token` cookie, verifies it with `jsonwebtoken`, and attaches the decoded user to `req.user`. Returns 401/403 on failure. |
| `sql-utils.ts` | SQL query builder utilities. Provides `conditionIn` (builds `IN (?, ?, ?)` clauses), `generateSortSql`, and `generateFilterSql` helpers for constructing parameterised dynamic queries safely. |
| `types.ts` | Shared TypeScript types. Defines `Primative`, `SortParams`, `SortOpts<T>`, `FilterOpts<T>`, `PageSizePrams`, `SearchParams`, and `DefaultQueryParams` used by query builder utilities and route handlers. |

---

## `routes/audit/`

Handles audit log operations at `/api/audit`.

| File | Description |
|------|-------------|
| `index.ts` | Audit router. Mounts the GET and POST audit handlers. |
| `types.ts` | `Audit` TypeScript interface — defines `log_ref`, `user`, `field_changed`, `action_type` (CREATE/UPDATE/DELETE), `log_dttm`, `api_source`, and `changed_by`. |

### `get/`

| File | Description |
|------|-------------|
| `handler.ts` | `GET /api/audit` — queries the `audit_logs` table and returns all entries as a parsed JSON array. |
| `sql.ts` | `getAudits()` — CTE-based SQL query that selects all audit log columns and wraps the result set in a JSON object with a `total_count` and `data` array. |

### `post/`

| File | Description |
|------|-------------|
| `handler.ts` | `POST /api/audit` — inserts a new audit log entry from the request body and responds with the created record including `insertId` and `log_dttm`. |
| `sql.ts` | `createAuditLogQuery(audit)` — parameterised INSERT into `audit_logs` (`user`, `field_changed`, `changed_by`, `action_type`, `log_dttm`, `api_source`). |

---

## `routes/auth/`

Handles authentication at `/api/auth`.

| File | Description |
|------|-------------|
| `index.ts` | Auth router. Mounts login, logout, and session-check handlers. |

### `get/`

| File | Description |
|------|-------------|
| `handler.ts` | `GET /api/auth/me` — reads the `auth_token` cookie, verifies the JWT, and returns the decoded user payload. Returns 401 if the token is absent or invalid. |

### `post/`

| File | Description |
|------|-------------|
| `handler.ts` | `POST /api/auth/login` — looks up the user by email, compares bcrypt-hashed passwords, signs a JWT, and sets it as an `httpOnly` cookie. Decrypts PII fields before embedding in the token. |
| `sql.ts` | `getUserByEmail()` — selects `id`, `email_address`, `password`, `first_name`, `last_name`, and `type` from `users` where email matches. |
| `logout.ts` | `POST /api/auth/logout` — clears the `auth_token` cookie and returns a 200 success response. |

---

## `routes/products/`

Handles product operations at `/api/products`.

| File | Description |
|------|-------------|
| `index.ts` | Products router. Mounts GET all, GET filtered, GET by ID, POST create, PUT update, and image upload handlers. |
| `types.ts` | `Product` TypeScript type. Also defines `SortOptions` and `FilterOptions` interfaces used by query builder utilities. |

### `get/`

| File | Description |
|------|-------------|
| `handler.ts` | `GET /api/products` — executes `GetAllProductsQuery` with any provided query params and returns all products as a JSON-wrapped result. |
| `sql.ts` | `GetAllProductsQuery(params, search?)` — CTE-based SELECT query joining `products` and `product_images`. Supports dynamic sort via `generateSortSql` and filter via `generateFilterSql`. Aggregates images as a JSON array per product. |

### `get-by-id/`

| File | Description |
|------|-------------|
| `handler.ts` | `GET /api/products/:id` — fetches a single product record by ID and returns the raw query rows. |
| `sql.ts` | `GetSpecificProductsQuery(id)` — CTE query selecting a single product by `id`, with images aggregated as a JSON array. |

### `get-filtered/`

| File | Description |
|------|-------------|
| `handler.ts` | `GET /api/products/filter` — accepts query string filters (`product_name`, `is_live`, `on_sale`, etc.) and returns matching products. Parses the `images` JSON string on each product before responding. |
| `sql.ts` | Placeholder — filter SQL is currently delegated to `get/sql.ts` via `GetAllProductsQuery`. |

### `create/`

| File | Description |
|------|-------------|
| `handler.ts` | `POST /api/products` — normalises and validates the request body using `toNumber`, `toInteger`, and `toBoolean` helpers, then inserts a new product row. Returns 400 for invalid fields or 500 on database error. |
| `sql.ts` | `createProductQuery(product)` — parameterised INSERT into `products` (`id`, `category`, `description`, `price`, `quantity`, `on_sale`, `product_name`, `is_live`, `sale_percent`). |

### `update/`

| File | Description |
|------|-------------|
| `handler.ts` | `PUT /api/products/:id` — updates an existing product record from the request body and returns `affectedRows`. |
| `sql.ts` | `updateProductQuery(id, product)` — parameterised UPDATE setting all product fields where `id` matches. |

### `images/uploadImages/`

| File | Description |
|------|-------------|
| `handler.ts` | `POST /api/products/:id/images/upload` — accepts multipart file uploads via `multer`, saves files to `client/public/images/` with sanitised timestamped filenames, then inserts each image path into the `product_images` table. Returns the list of saved image paths. |
| `sql.ts` | `ADD_IMAGE_TO_PRODUCT_QUERY` — parameterised INSERT into `product_images` (`product_id`, `image_path`). |

---

## `routes/users/`

Handles user operations at `/api/users`. All PII fields (name, address, telephone) are AES-256-CBC encrypted at rest and decrypted on read.

| File | Description |
|------|-------------|
| `index.ts` | Users router. Mounts GET all, GET by ID, POST create, PUT update, and DELETE handlers. |
| `types.ts` | `User` TypeScript interface — defines all user fields including encrypted PII and hashed password fields. |

### `get/`

| File | Description |
|------|-------------|
| `handler.ts` | `GET /api/users` — fetches all users, decrypts `first_name` and `last_name` for each record, and returns the list. |
| `sql.ts` | `GetAllUsersQuery()` — CTE-based SELECT of all columns from the `users` table, wrapped in a JSON result object. |

### `get-by-id/`

| File | Description |
|------|-------------|
| `handler.ts` | `GET /api/users/:id` — fetches a single user by ID and decrypts all PII fields (`first_name`, `last_name`, `address_line1–3`, `telephone_number`) before returning. |
| `sql.ts` | `GetSpecificUsersQuery(id)` — CTE query selecting a single user by `id`. |

### `create/`

| File | Description |
|------|-------------|
| `handler.ts` | `POST /api/users` — encrypts PII fields using `encrypt()`, hashes the password with `bcrypt`, then inserts the new user record. |
| `sql.ts` | `createUserQuery(user)` — parameterised INSERT into `users` with all fields. |

### `update/`

| File | Description |
|------|-------------|
| `handler.ts` | `PUT /api/users/:id` — accepts a partial user object, encrypts any PII fields present, hashes the password if included, and executes a dynamic UPDATE (only fields provided are updated). |
| `sql.ts` | `updateUserQuery(user, id)` — parameterised UPDATE setting all user fields for a given `id`. |

### `delete/`

| File | Description |
|------|-------------|
| `handler.ts` | `DELETE /api/users/:id` — removes the user record with the given ID from the database. |
| `sql.ts` | `DeleteUserQuery(id)` — parameterised `DELETE FROM users WHERE id = ?`. |

---

## `scripts/`

Utility scripts for key management and data maintenance. Run with `npm run <script>`.

| Script | Description |
|--------|-------------|
| `generate-encryption-key.js` | Generates a cryptographically secure 64-character hex encryption key for use in `.env`. |
| `print-key-fingerprints.js` | Prints SHA-256 fingerprints of `ENCRYPTION_KEY` and `ENCRYPTION_KEY_PREVIOUS` to verify which keys are loaded. |
| `generate-user-insert.js` | Interactive script that prompts for user details and outputs a ready-to-run SQL INSERT with encrypted PII. |
| `repair-encrypted-users.js` | Scans all users and attempts decryption; use `--apply` flag to re-encrypt records using the current key (supports key rotation). |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/login` | Authenticate a user and set a session cookie. |
| `POST` | `/api/auth/logout` | Clear the session cookie. |
| `GET` | `/api/auth/me` | Return the currently authenticated user from the JWT. |
| `GET` | `/api/products` | Return all products. |
| `GET` | `/api/products/filter` | Return products matching query string filters. |
| `GET` | `/api/products/:id` | Return a single product by ID. |
| `POST` | `/api/products` | Create a new product. |
| `PUT` | `/api/products/:id` | Update an existing product. |
| `POST` | `/api/products/:id/images/upload` | Upload and attach images to a product. |
| `GET` | `/api/users` | Return all users (PII decrypted). |
| `GET` | `/api/users/:id` | Return a single user by ID (PII decrypted). |
| `POST` | `/api/users` | Create a new user (PII encrypted, password hashed). |
| `PUT` | `/api/users/:id` | Update a user (PII encrypted on write). |
| `DELETE` | `/api/users/:id` | Delete a user by ID. |
| `GET` | `/api/audit` | Return all audit log entries. |
| `POST` | `/api/audit` | Create a new audit log entry. |
