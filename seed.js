import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

import db, { initDatabase } from "./db.js";

const main = async () => {
  await initDatabase();

  await db.query("DELETE FROM expenses");
  await db.query("DELETE FROM fuel_logs");
  await db.query("DELETE FROM maintenance_logs");
  await db.query("DELETE FROM trips");
  await db.query("DELETE FROM drivers");
  await db.query("DELETE FROM vehicles");
  await db.query("DELETE FROM users");

  // ================= USERS =================

  await db.query(`
    INSERT INTO users (email,password_hash,role)
    VALUES
    ('manager@transitops.com','password','fleet_manager'),
    ('driver@transitops.com','password','driver'),
    ('safety@transitops.com','password','safety_officer'),
    ('finance@transitops.com','password','financial_analyst')
  `);

  // ================= VEHICLES =================

  await db.query(`
    INSERT INTO vehicles
    (registration_number,name,vehicle_type,load_capacity,odometer,avg_cost,status)
    VALUES
    ('MH12AB1234','VAN-05','Van','500 kg',74000,620000,'available'),
    ('MH14CD5678','TRK-12','Truck','5 Ton',182000,2450000,'on_trip'),
    ('MH01EF9911','MINI-02','Mini Truck','1 Ton',66000,410000,'in_shop'),
    ('MH20GH2211','VAN-09','Van','750 kg',241000,590000,'retired');
  `);

  // ================= DRIVERS =================

  await db.query(`
    INSERT INTO drivers
    (
      name,
      license_number,
      license_category,
      license_expiry_date,
      contact_number,
      trip_completion_percentage,
      safety_score,
      status
    )
    VALUES
    ('Alex','DL-89213','LMV','2028-12-01','9876500001',96,96,'available'),
    ('John','DL-44120','HMV','2025-03-01','9823000002',87,87,'suspended'),
    ('Priya','DL-77031','LMV','2030-08-01','9911000003',99,99,'on_trip'),
    ('Suresh','DL-90045','HMV','2027-01-01','9744000004',89,89,'off_duty');
  `);

  // ================= TRIPS =================

  await db.query(`
    INSERT INTO trips
    (
      vehicle_id,
      driver_id,
      source,
      destination,
      cargo_weight_kg,
      planned_distance_km,
      start_odometer_km,
      final_odometer_km,
      revenue,
      status,
      dispatched_at,
      completed_at
    )
    VALUES
    (1,1,'Pune','Mumbai',450,160,74000,74160,25000,'completed',NOW()-INTERVAL '2 day',NOW()-INTERVAL '1 day'),

    (2,3,'Mumbai','Nagpur',4200,810,182000,NULL,NULL,'dispatched',NOW()-INTERVAL '4 hour',NULL),

    (3,2,'Pune','Nashik',800,220,NULL,NULL,NULL,'draft',NULL,NULL),

    (4,4,'Pune','Kolhapur',600,240,241000,241240,18000,'cancelled',NOW()-INTERVAL '5 day',NULL);
  `);

  // ================= MAINTENANCE =================

  await db.query(`
    INSERT INTO maintenance_logs
    (
      vehicle_id,
      service_type,
      cost,
      started_at,
      completed_at,
      status
    )
    VALUES
    (2,'Engine Repair',18000,'2026-07-05','2026-07-07','completed'),

    (3,'Oil Change',2500,'2026-07-10',NULL,'active');
  `);

  // ================= FUEL =================

  await db.query(`
    INSERT INTO fuel_logs
    (
      vehicle_id,
      trip_id,
      liters,
      cost,
      refueled_at
    )
    VALUES
    (1,1,42,5200,'2026-07-10'),

    (2,2,125,15600,'2026-07-11'),

    (3,NULL,30,3600,'2026-07-12');
  `);

  // ================= EXPENSES =================

  await db.query(`
    INSERT INTO expenses
    (
      trip_id,
      vehicle_id,
      toll,
      other,
      maintenance_cost,
      fuel_cost,
      total_cost,
      expense_date
    )
    VALUES
    (1,1,120,0,0,5200,5320,'2026-07-10'),

    (2,2,340,150,18000,15600,34090,'2026-07-11'),

    (3,3,0,0,2500,3600,6100,'2026-07-12');
  `);

  console.log("Database seeded successfully 🚀");

  process.exit(0);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});