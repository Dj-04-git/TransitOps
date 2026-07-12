# TransitOps Context

This document captures the current implementation state of the TransitOps auth and fleet pages after the recent changes.

## What Has Been Done

### Authentication Flow
- Registration now posts `email`, `password`, and `role` to the PostgreSQL-backed auth API.
- Login now validates `email`, `password`, and `role`, stores the JWT in `localStorage`, and redirects by role.
- Fleet managers are redirected to `/registry` after login.
- Other users are redirected to `/`.
- The shared navbar now shows only `Logout` when a valid JWT is present.
- Login and signup actions are hidden for authenticated sessions.

### PostgreSQL Schema
- `users` table exists for auth:
  - `id`
  - `email`
  - `password_hash`
  - `role`
  - `created_at`
- `vehicles` table was added for registry data.
- `drivers` table was added for driver registry data.
- Supporting enum types were added for vehicle, driver, trip, and maintenance statuses.

### Fleet Registry
- Added `/registry` page for fleet managers.
- The page reads vehicles from PostgreSQL via `/api/fleet-manager/vehicles`.
- The page supports adding a vehicle through a modal form.
- The table displays:
  - registration number
  - name / model
  - type
  - load capacity
  - odometer
  - average cost
  - status
- Seed data was added for vehicles.

### Drivers Page
- The drivers page was aligned to the real `drivers` table schema.
- The driver loader now reads from `/api/drivers`.
- The page now supports adding, editing, and deleting drivers.
- The page now maps these DB fields correctly:
  - `name`
  - `license_number`
  - `license_category`
  - `license_expiry_date`
  - `contact_number`
  - `trip_completion_percentage`
  - `safety_score`
  - `status`

### Seed Script
- Added `seed.js` for clearing and reloading demo data.
- The seed script now loads users, vehicles, drivers, trips, maintenance logs, fuel logs, and expenses.

### UI / Theme
- Auth pages were rebuilt using Tailwind + DaisyUI and aligned with the TransitOps theme.
- IBM Plex Sans and IBM Plex Mono were added to the shared head partial.
- `app.css` now applies the TransitOps theme fonts globally.
- The shared navbar was updated to behave differently for guest vs authenticated users.

## Important Files

- [db.js](db.js) - PostgreSQL schema bootstrap and pool.
- [index.js](index.js) - Express app entry point and page routes.
- [seed.js](seed.js) - Demo data loader.
- [routes/authRoutes.js](routes/authRoutes.js) - Auth endpoints.
- [routes/fleetManagerRoutes.js](routes/fleetManagerRoutes.js) - Fleet vehicle API.
- [routes/driversRoutes.js](routes/driversRoutes.js) - Driver CRUD API.
- [pages/login.ejs](pages/login.ejs) - Login page.
- [pages/register.ejs](pages/register.ejs) - Register page.
- [pages/registry.ejs](pages/registry.ejs) - Vehicle registry page.
- [pages/drivers.ejs](pages/drivers.ejs) - Driver registry page.
- [pages/js/drivers.js](pages/js/drivers.js) - Driver page behavior.
- [pages/partials/navbar.ejs](pages/partials/navbar.ejs) - Shared auth-aware navbar.
- [pages/partials/head.ejs](pages/partials/head.ejs) - Shared HTML head and fonts.

## Current Behavior

- Logged-in fleet managers can view `/registry` and work with vehicle data.
- Logged-in users do not see Login/Get started in the navbar.
- Logout is shown instead and clears session data.
- The drivers page now loads real PostgreSQL rows and can insert new drivers.

## Notes

- The app is still mixing older pages and newer pages in some areas.
- Some routes in `index.js` still render legacy page names for views that may not exist yet.
- The current driver UI is functional with the new API, but the styling is still based on the older dashboard layout rather than the newer DaisyUI control-room layout used on auth and registry pages.
