# TransitOps Auth Backend Plan

## Goal
Migrate the authentication backend from the current SQLite-style flow to PostgreSQL, and support these roles in the `users` table:

- `fleet_manager`
- `driver`
- `safety_officer`
- `financial_analyst`

The frontend should later allow a user to choose one of these roles during registration, but this document focuses on the backend design and requirements only.

## Current Backend Requirements
The current backend needs the following to run correctly:

- Node.js 18+.
- A database implementation at `db.js`.
- Installed packages for:
  - `express`
  - `cors`
  - `dotenv`
  - `ejs`
  - `pg`
  - `bcrypt`
  - `jsonwebtoken`
  - `nodemailer`
- Environment variables:
  - `JWT_SECRET`
  - `EMAIL`
  - `EMAIL_PASS`
  - `PORT`
  - PostgreSQL connection settings such as `DATABASE_URL` or host/user/password fields
- A PostgreSQL database with the auth schema already created.

## Current Code Gaps
The current auth code assumes features that do not match the target schema:

- It uses a SQLite-like `db.run` and `db.get` interface, but PostgreSQL uses queries through `pg`.
- It stores `password`, `otp`, `isVerified`, `name`, `phone`, `location`, and `about`, but your target schema only has:
  - `id`
  - `email`
  - `password_hash`
  - `role`
  - `created_at`
- It includes OTP registration and password reset flows, but the target schema does not include OTP columns.
- The current profile endpoints expect profile fields that do not exist in the proposed schema.

## Target PostgreSQL Schema
You provided this schema:

```sql
CREATE TYPE user_role AS ENUM (
    'fleet_manager',
    'driver',
    'safety_officer',
    'financial_analyst'
);

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role user_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Backend Integration Plan

### 1. Replace the database layer with PostgreSQL
- Create a shared PostgreSQL connection module using `pg`.
- Remove all SQLite-style calls from the auth controller.
- Use parameterized SQL queries for every database operation.

### 2. Update registration
- Accept `email`, `password`, and `role` from the request body.
- Validate that the role is one of the four supported values.
- Hash the password with `bcrypt` before saving it.
- Insert the new user into PostgreSQL with `password_hash` and `role`.

### 3. Update login
- Look up the user by email.
- Compare the password against `password_hash`.
- Return a JWT that includes at least:
  - `id`
  - `email`
  - `role`
- Keep JWT expiration enabled.

### 4. Add role checks
- Keep auth middleware for token verification.
- Add optional role-guard middleware for role-specific routes later.
- This will support future pages or APIs for each role.

### 5. Decide what to do with OTP
The current code uses OTP for registration and reset flows, but the schema does not support it.

You have two options:

- Remove OTP flows for now and keep auth simple.
- Add OTP support by extending the schema or creating a separate verification table.

For a backend-only first pass, the simplest choice is to remove OTP dependence until you decide if email verification is required.

### 6. Rework profile endpoints
The current profile routes expect fields that are not in the new schema.

Options:

- Remove profile endpoints until a profile table is added.
- Create a separate `user_profiles` table later for name, phone, location, and notes.

### 7. Prepare frontend role selection
The frontend should later send the selected role during registration.

The backend should:
- Reject missing or invalid roles.
- Store the selected role in the `users` table.
- Use the role from the JWT for authorization decisions.

## Suggested Backend Flow

### Registration
1. User chooses a role on the frontend.
2. Frontend sends email, password, and role to the backend.
3. Backend validates role and email.
4. Backend hashes password.
5. Backend inserts user into PostgreSQL.
6. Backend returns success.

### Login
1. User sends email and password.
2. Backend fetches the user by email.
3. Backend compares the password hash.
4. Backend returns a JWT containing the user id and role.

### Protected Routes
1. Client sends the JWT in the `Authorization` header.
2. Middleware verifies the token.
3. Route handlers use the decoded user id and role.

## Backend-Only Validation Checklist
Use this checklist to verify the integration without touching the frontend yet:

- PostgreSQL can connect from the Node app.
- The enum type and `users` table are created successfully.
- A user can register with each supported role.
- Duplicate email registration fails correctly.
- Login succeeds for valid credentials.
- Login fails for invalid passwords.
- JWT contains user id and role.
- Protected routes reject missing or invalid tokens.
- Protected routes reject a user trying to access another user's resource if that rule is enforced.

## Recommended Next Step
Implement the PostgreSQL database module first, then update `register`, `login`, and middleware. After that, decide whether OTP and profile endpoints should be removed or moved into separate tables.
