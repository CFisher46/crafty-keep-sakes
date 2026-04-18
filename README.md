# crafty-keep-sakes

Business Website

## Local setup

This project has separate frontend (`client`) and backend (`server`) apps.

### 1) Create env files

Copy the example env files:

- `cp client/.env.example client/.env`
- `cp server/.env.example server/.env`

Set values in `server/.env` for your local database and secrets.

If you have existing encrypted user records from an older key, set `ENCRYPTION_KEY_PREVIOUS` in `server/.env` so the backend can still decrypt legacy rows while using the new `ENCRYPTION_KEY` for future writes.

### 2) Install dependencies

- `cd client && npm install`
- `cd ../server && npm install`

### 3) Run backend and frontend

In one terminal:

- `cd server && npm run dev`

In another terminal:

- `cd client && npm start`

The frontend reads `REACT_APP_API_URL` from `client/.env` and should point to your backend URL (default: `http://localhost:3001`).

### 4) Run the baseline tests

From the repo root:

- `npm test` runs the server and client test suites.
- `npm run test:server` runs the backend tests only.
- `npm run test:client` runs the frontend tests once without watch mode.

The current baseline is intentionally read-only on the backend. Server tests mock the shared database module so they catch route and response regressions without writing to MySQL.

## Encrypted user data recovery

If old encrypted user fields can no longer be decrypted (lost historical key), run the server repair script.

From the `server` directory:

- `npm run repair:encrypted-users` (dry run)
- `npm run repair:encrypted-users:apply` (persists changes)

The script only clears undecryptable encrypted fields (`first_name`, `last_name`, address lines, telephone). Users can then re-enter those values and they will be encrypted with the current key.

## Create encrypted admin user (manual DB insert)

From `server`, generate a ready-to-paste SQL `INSERT` using the current `ENCRYPTION_KEY`:

- `npm run user:generate-insert -- --email admin@example.com --password ChangeMe123! --firstName Admin --lastName User --address1 "HQ" --town "London" --county "Greater London" --postcode "SW1A 1AA" --telephone "07123456789" --type admin --status active`

The command prints one SQL statement. Copy that statement and run it in MySQL.

If you want defaults for most fields, only email and password are required:

- `npm run user:generate-insert -- --email admin@example.com --password ChangeMe123!`

Notes:

- The generated `password` is bcrypt-hashed.
- `first_name`, `last_name`, address lines, and `telephone_number` are encrypted with your current key.
- Change the password immediately after first login if you use a temporary value.

## Encryption key runbook

### Generate a new key

From `server`:

- `npm run key:generate`

Copy the emitted key into `ENCRYPTION_KEY` in `server/.env`.

### Rotation process

1. Put the current key in `ENCRYPTION_KEY_PREVIOUS`.
2. Put the new key in `ENCRYPTION_KEY`.
3. Restart backend.
4. As users update records, new writes use the new key while old values still decrypt through `ENCRYPTION_KEY_PREVIOUS`.
5. After all old data is re-written, remove `ENCRYPTION_KEY_PREVIOUS`.

### Backup policy

- Store `ENCRYPTION_KEY` and `ENCRYPTION_KEY_PREVIOUS` in a password manager or secret manager (not only local `.env`).
- Keep at least two backups in separate secure locations.
- Record fingerprints with `npm run key:fingerprints` and store them with release notes to verify the intended keys are loaded.
