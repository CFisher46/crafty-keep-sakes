# crafty-keep-sakes

Business Website

## Local setup

This project has separate frontend (`client`) and backend (`server`) apps.

### 1) Create env files

Copy the example env files:

- `cp client/.env.example client/.env`
- `cp server/.env.example server/.env`

Set values in `server/.env` for your local database and secrets.

### 2) Install dependencies

- `cd client && npm install`
- `cd ../server && npm install`

### 3) Run backend and frontend

In one terminal:

- `cd server && npm run dev`

In another terminal:

- `cd client && npm start`

The frontend reads `REACT_APP_API_URL` from `client/.env` and should point to your backend URL (default: `http://localhost:3001`).

## Database schema recovery

Reset or restore the v2 schema by running the bootstrap script from the project root:

- `mysql -u <user> -p <server/scripts/migrations/phase1_schema_v2.sql`

This bootstrap includes the standard v2 tables and the blog post tracking table used for NEW badges (`blog_post_views_v2`).

## Create an admin user (manual DB insert)

From `server`, generate a ready-to-paste SQL script for the v2 tables:

- `npm run user:generate-insert -- --email admin@example.com --password ChangeMe123! --firstName Admin --lastName User --role admin`

The command prints three SQL statements (`users_v2`, `user_roles_v2`, `customer_profiles_v2`) with no session variables. Run them in order in MySQL.

Notes:

- The password is bcrypt-hashed.
- Change the password immediately after first login if you use a temporary value.
