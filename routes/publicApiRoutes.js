import express from "express";
import db from "../db.js";
import vehicleController from "../controllers/vehicleController.js";
import driverController from "../controllers/driverController.js";
import tripController from "../controllers/tripController.js";
import maintenanceController from "../controllers/maintenanceController.js";

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

router.get("/vehicles/available", vehicleController.getAvailableVehicles);

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

router.get("/trips/all", tripController.getTrips);

router.post("/trips", tripController.createTrip);

router.patch("/trips/:id/dispatch", tripController.dispatchTrip);

router.patch("/trips/:id/complete", tripController.completeTrip);

router.patch("/trips/:id/cancel", tripController.cancelTrip);

router.get("/drivers/available", driverController.getAvailableDrivers);

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
  return maintenanceController.getMaintenanceLogs(req, res);
});

router.post("/maintenance", async (req, res) => {
  return maintenanceController.createMaintenanceLog(req, res);
});

router.patch("/maintenance/:id/close", async (req, res) => {
  return maintenanceController.closeMaintenanceLog(req, res);
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