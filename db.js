import pg from "pg";
import { config } from "./config.js";

const { Pool } = pg;

if (!config.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to connect to PostgreSQL");
}

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 10
});

const ensureUserSchema = async () => {
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'user_role'
          AND n.nspname = 'public'
      ) THEN
        CREATE TYPE user_role AS ENUM (
          'fleet_manager',
          'driver',
          'safety_officer',
          'financial_analyst'
        );
      END IF;
    END
    $$;

    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role user_role NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
};

const ensureVehicleSchema = async () => {
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'vehicle_status'
          AND n.nspname = 'public'
      ) THEN
        CREATE TYPE vehicle_status AS ENUM (
          'available',
          'on_trip',
          'in_shop',
          'retired'
        );
      END IF;
    END
    $$;

    CREATE TABLE IF NOT EXISTS vehicles (
      id BIGSERIAL PRIMARY KEY,
      registration_number VARCHAR(32) NOT NULL UNIQUE,
      name VARCHAR(120) NOT NULL,
      vehicle_type VARCHAR(50) NOT NULL,
      load_capacity VARCHAR(32) NOT NULL,
      odometer INTEGER NOT NULL DEFAULT 0,
      avg_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
      status vehicle_status NOT NULL DEFAULT 'available',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
};

const ensureDriverSchema = async () => {
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'driver_status'
          AND n.nspname = 'public'
      ) THEN
        CREATE TYPE driver_status AS ENUM (
          'available',
          'on_trip',
          'off_duty',
          'suspended'
        );
      END IF;
    END
    $$;

    CREATE TABLE IF NOT EXISTS drivers (
      id BIGSERIAL PRIMARY KEY,

      name VARCHAR(100) NOT NULL,

      license_number VARCHAR(50) NOT NULL UNIQUE,

      license_category VARCHAR(20) NOT NULL,

      license_expiry_date DATE NOT NULL,

      contact_number VARCHAR(15),

      trip_completion_percentage NUMERIC(5,2)
        CHECK (trip_completion_percentage >= 0 AND trip_completion_percentage <= 100),

      safety_score NUMERIC(5,2)
        CHECK (safety_score >= 0 AND safety_score <= 100),

      status driver_status NOT NULL DEFAULT 'available',

      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
};

const ensureTripSchema = async () => {
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'trip_status'
          AND n.nspname = 'public'
      ) THEN
        CREATE TYPE trip_status AS ENUM (
          'draft',
          'dispatched',
          'completed',
          'cancelled'
        );
      END IF;
    END
    $$;

    CREATE TABLE IF NOT EXISTS trips (
      id BIGSERIAL PRIMARY KEY,

      vehicle_id BIGINT NOT NULL,
      driver_id BIGINT NOT NULL,

      source VARCHAR(100) NOT NULL,
      destination VARCHAR(100) NOT NULL,

      cargo_weight_kg NUMERIC(10,2) NOT NULL,

      planned_distance_km NUMERIC(10,2) NOT NULL,

      start_odometer_km NUMERIC(10,2),

      final_odometer_km NUMERIC(10,2),

      revenue NUMERIC(12,2),

      status trip_status NOT NULL DEFAULT 'draft',

      dispatched_at TIMESTAMPTZ,

      completed_at TIMESTAMPTZ,

      cancelled_at TIMESTAMPTZ,

      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      CONSTRAINT fk_trip_vehicle
        FOREIGN KEY (vehicle_id)
        REFERENCES vehicles(id)
        ON DELETE RESTRICT,

      CONSTRAINT fk_trip_driver
        FOREIGN KEY (driver_id)
        REFERENCES drivers(id)
        ON DELETE RESTRICT
    );
  `);
};

const ensureMaintenanceSchema = async () => {
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'maintenance_status'
          AND n.nspname = 'public'
      ) THEN
        CREATE TYPE maintenance_status AS ENUM (
          'active',
          'completed'
        );
      END IF;
    END
    $$;

    CREATE TABLE IF NOT EXISTS maintenance_logs (
      id BIGSERIAL PRIMARY KEY,

      vehicle_id BIGINT NOT NULL,

      service_type VARCHAR(100) NOT NULL,

      cost NUMERIC(12,2) NOT NULL,

      started_at DATE NOT NULL,

      completed_at DATE,

      status maintenance_status NOT NULL DEFAULT 'active',

      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      CONSTRAINT fk_maintenance_vehicle
        FOREIGN KEY (vehicle_id)
        REFERENCES vehicles(id)
        ON DELETE RESTRICT
    );
  `);
};

const ensureFuelLogSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS fuel_logs (
    id BIGSERIAL PRIMARY KEY,

    vehicle_id BIGINT NOT NULL,
    trip_id BIGINT,

    liters NUMERIC(10,2) NOT NULL,
    cost NUMERIC(12,2) NOT NULL,

    refueled_at DATE NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_fuel_vehicle
        FOREIGN KEY (vehicle_id)
        REFERENCES vehicles(id),

    CONSTRAINT fk_fuel_trip
        FOREIGN KEY (trip_id)
        REFERENCES trips(id)
        ON DELETE SET NULL
    );
  `);
};

const ensureExpenseSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id BIGSERIAL PRIMARY KEY,

      trip_id BIGINT NOT NULL,

      vehicle_id BIGINT NOT NULL,

      toll NUMERIC(12,2) NOT NULL DEFAULT 0,

      other NUMERIC(12,2) NOT NULL DEFAULT 0,

      maintenance_cost NUMERIC(12,2) NOT NULL DEFAULT 0,

      fuel_cost NUMERIC(12,2) NOT NULL DEFAULT 0,

      total_cost NUMERIC(12,2) NOT NULL DEFAULT 0,

      expense_date DATE NOT NULL,

      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      CONSTRAINT fk_expense_trip
        FOREIGN KEY (trip_id)
        REFERENCES trips(id)
        ON DELETE CASCADE,

      CONSTRAINT fk_expense_vehicle
        FOREIGN KEY (vehicle_id)
        REFERENCES vehicles(id)
        ON DELETE RESTRICT
    );
  `);
};

export const initDatabase = async () => {
  await pool.query("SELECT 1");
  await ensureUserSchema();
  await ensureVehicleSchema();
  await ensureDriverSchema();
  await ensureTripSchema();
  await ensureMaintenanceSchema();
  await ensureFuelLogSchema();
  await ensureExpenseSchema();
};

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});

export default pool;
