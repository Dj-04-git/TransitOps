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

export const initDatabase = async () => {
  await pool.query("SELECT 1");
  await ensureUserSchema();
  await ensureVehicleSchema();
};

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});

export default pool;
