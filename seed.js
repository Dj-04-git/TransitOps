import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

import db, { initDatabase } from "./db.js";

const seedVehicles = [
  {
    registrationNumber: "GJ01AB4521",
    name: "VAN-05",
    vehicleType: "Van",
    loadCapacity: "500 kg",
    odometer: 74000,
    avgCost: 620000,
    status: "available"
  },
  {
    registrationNumber: "GJ01AB4799",
    name: "TRUCK-11",
    vehicleType: "Truck",
    loadCapacity: "5 Ton",
    odometer: 132000,
    avgCost: 2450000,
    status: "on_trip"
  },
  {
    registrationNumber: "GJ01AB8120",
    name: "MINI-02",
    vehicleType: "Mini",
    loadCapacity: "1 Ton",
    odometer: 66000,
    avgCost: 410000,
    status: "in_shop"
  },
  {
    registrationNumber: "GJ01AB0008",
    name: "VAN-09",
    vehicleType: "Van",
    loadCapacity: "750 kg",
    odometer: 241900,
    avgCost: 590000,
    status: "retired"
  }
];

const main = async () => {
  await initDatabase();

  await db.query("DELETE FROM vehicles");

  for (const vehicle of seedVehicles) {
    await db.query(
      `INSERT INTO vehicles (
         registration_number,
         name,
         vehicle_type,
         load_capacity,
         odometer,
         avg_cost,
         status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        vehicle.registrationNumber,
        vehicle.name,
        vehicle.vehicleType,
        vehicle.loadCapacity,
        vehicle.odometer,
        vehicle.avgCost,
        vehicle.status
      ]
    );
  }

  console.log(`Seeded ${seedVehicles.length} vehicles.`);
  process.exit(0);
};

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
