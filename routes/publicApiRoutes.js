import express from "express";
import db from "../db.js";

const router = express.Router();

router.get("/vehicles", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        id,
        registration_number,
        name,
        vehicle_type,
        load_capacity,
        odometer,
        avg_cost,
        status,
        created_at,
        updated_at
      FROM vehicles
      ORDER BY created_at DESC, id DESC
    `);

    return res.json({ vehicles: result.rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Failed to load vehicles" });
  }
});

router.get("/trips", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        t.id,
        t.vehicle_id,
        v.registration_number AS "vehicleName",
        t.driver_id,
        t.source,
        t.destination,
        t.cargo_weight_kg,
        t.planned_distance_km,
        t.start_odometer_km,
        t.final_odometer_km,
        t.revenue,
        t.status,
        t.dispatched_at,
        t.completed_at,
        t.cancelled_at,
        t.created_at
      FROM trips t
      LEFT JOIN vehicles v ON v.id = t.vehicle_id
      ORDER BY t.created_at DESC, t.id DESC
    `);

    return res.json({ trips: result.rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Failed to load trips" });
  }
});

router.get("/fuel", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        f.id,
        f.vehicle_id,
        v.registration_number AS "vehicleName",
        f.trip_id,
        f.liters,
        f.cost,
        f.refueled_at,
        f.created_at
      FROM fuel_logs f
      LEFT JOIN vehicles v ON v.id = f.vehicle_id
      ORDER BY f.refueled_at DESC, f.id DESC
    `);

    return res.json({ fuelLogs: result.rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Failed to load fuel logs" });
  }
});

router.get("/maintenance", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        m.id,
        m.vehicle_id,
        v.registration_number AS "vehicleName",
        m.service_type,
        m.cost,
        m.started_at,
        m.completed_at,
        m.status,
        m.created_at
      FROM maintenance_logs m
      LEFT JOIN vehicles v ON v.id = m.vehicle_id
      ORDER BY m.created_at DESC, m.id DESC
    `);

    return res.json({ maintenanceLogs: result.rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Failed to load maintenance logs" });
  }
});

router.get("/expenses", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        e.id,
        e.trip_id,
        CONCAT(t.source, ' → ', t.destination) AS "tripLabel",
        e.vehicle_id,
        v.registration_number AS "vehicleName",
        e.toll,
        e.other,
        e.maintenance_cost,
        e.fuel_cost,
        e.total_cost,
        e.expense_date,
        e.created_at
      FROM expenses e
      LEFT JOIN trips t ON t.id = e.trip_id
      LEFT JOIN vehicles v ON v.id = e.vehicle_id
      ORDER BY e.expense_date DESC, e.id DESC
    `);

    return res.json({ expenses: result.rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Failed to load expenses" });
  }
});

export default router;