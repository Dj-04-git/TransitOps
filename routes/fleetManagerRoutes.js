import express from "express";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import db from "../db.js";

const router = express.Router();

router.get("/vehicles", protect, authorizeRoles("fleet_manager"), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id,
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
       ORDER BY created_at DESC, id DESC`
    );

    return res.json({ vehicles: result.rows });
  } catch (error) {
    console.error("Fetch vehicles error:", error);
    return res.status(500).json({ error: "Failed to load vehicles" });
  }
});

router.post("/vehicles", protect, authorizeRoles("fleet_manager"), async (req, res) => {
  const registrationNumber = typeof req.body.registrationNumber === "string" ? req.body.registrationNumber.trim().toUpperCase() : "";
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const vehicleType = typeof req.body.vehicleType === "string" ? req.body.vehicleType.trim() : "";
  const loadCapacity = typeof req.body.loadCapacity === "string" ? req.body.loadCapacity.trim() : "";
  const odometer = Number(req.body.odometer);
  const avgCost = Number(req.body.avgCost);
  const status = typeof req.body.status === "string" ? req.body.status.trim().toLowerCase() : "available";

  if (!registrationNumber || !name || !vehicleType || !loadCapacity) {
    return res.status(400).json({ error: "Registration number, name, type, and load capacity are required" });
  }

  if (!Number.isFinite(odometer) || odometer < 0) {
    return res.status(400).json({ error: "Odometer must be a non-negative number" });
  }

  if (!Number.isFinite(avgCost) || avgCost < 0) {
    return res.status(400).json({ error: "Average cost must be a non-negative number" });
  }

  const allowedStatuses = ["available", "on_trip", "in_shop", "retired"];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid vehicle status", allowedStatuses });
  }

  try {
    const result = await db.query(
      `INSERT INTO vehicles (
         registration_number,
         name,
         vehicle_type,
         load_capacity,
         odometer,
         avg_cost,
         status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id,
                 registration_number,
                 name,
                 vehicle_type,
                 load_capacity,
                 odometer,
                 avg_cost,
                 status,
                 created_at,
                 updated_at`,
      [registrationNumber, name, vehicleType, loadCapacity, odometer, avgCost, status]
    );

    return res.status(201).json({ vehicle: result.rows[0] });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({ error: "Vehicle registration number already exists" });
    }

    console.error("Create vehicle error:", error);
    return res.status(500).json({ error: "Failed to create vehicle" });
  }
});

router.get("/me", protect, authorizeRoles("fleet_manager"), (req, res) => {
  res.json({
    message: "Fleet manager portal ready",
    user: req.user
  });
});

export default router;
