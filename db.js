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

export const initDatabase = async () => {
    await pool.query("SELECT 1");
    await ensureUserSchema();
};

pool.on("error", (error) => {
    console.error("Unexpected PostgreSQL pool error:", error);
});

export default pool;
