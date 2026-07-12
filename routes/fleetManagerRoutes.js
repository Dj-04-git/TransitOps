import express from "express";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import db from "../db.js";

const router = express.Router();

const VEHICLE_STATUSES = new Set(["available", "on_trip", "in_shop", "retired"]);

const toTitleCase = (value) =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const normalizeVehicleStatus = (value) => {
  const status = String(value || "available").trim().toLowerCase();
  return VEHICLE_STATUSES.has(status) ? status : "available";
};

const mapVehicleRow = (row) => ({
  id: Number(row.id),
  regNo: row.registration_number,
  nameModel: row.name,
  type: row.vehicle_type,
  capacity: row.load_capacity,
  odometer: row.odometer,
  acqCost: row.avg_cost != null ? Number(row.avg_cost) : 0,
  status: toTitleCase(row.status),
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

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

    const vehicles = result.rows.map(mapVehicleRow);

    return res.json({
      success: true,
      data: { vehicles },
      vehicles
    });
  } catch (error) {
    console.error("Fetch vehicles error:", error);
    return res.status(500).json({ error: "Failed to load vehicles" });
  }
});

router.post("/vehicles", protect, authorizeRoles("fleet_manager"), async (req, res) => {
  const registrationNumber = typeof req.body.registrationNumber === "string"
    ? req.body.registrationNumber.trim().toUpperCase()
    : typeof req.body.regNo === "string"
      ? req.body.regNo.trim().toUpperCase()
      : "";

  const name = typeof req.body.name === "string"
    ? req.body.name.trim()
    : typeof req.body.nameModel === "string"
      ? req.body.nameModel.trim()
      : "";

  const vehicleType = typeof req.body.vehicleType === "string"
    ? req.body.vehicleType.trim()
    : typeof req.body.type === "string"
      ? req.body.type.trim()
      : "";

  const loadCapacity = typeof req.body.loadCapacity === "string"
    ? req.body.loadCapacity.trim()
    : typeof req.body.capacity === "string"
      ? req.body.capacity.trim()
      : "";

  const odometer = Number(req.body.odometer);
  const avgCost = Number(req.body.avgCost ?? req.body.acqCost);
  const status = normalizeVehicleStatus(req.body.status);

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

router.put("/vehicles/:id", protect, authorizeRoles("fleet_manager"), async (req, res) => {
  const vehicleId = Number(req.params.id);

  if (!Number.isFinite(vehicleId)) {
    return res.status(400).json({ error: "Invalid vehicle id" });
  }

  const registrationNumber = typeof req.body.registrationNumber === "string"
    ? req.body.registrationNumber.trim().toUpperCase()
    : typeof req.body.regNo === "string"
      ? req.body.regNo.trim().toUpperCase()
      : "";

  const name = typeof req.body.name === "string"
    ? req.body.name.trim()
    : typeof req.body.nameModel === "string"
      ? req.body.nameModel.trim()
      : "";

  const vehicleType = typeof req.body.vehicleType === "string"
    ? req.body.vehicleType.trim()
    : typeof req.body.type === "string"
      ? req.body.type.trim()
      : "";

  const loadCapacity = typeof req.body.loadCapacity === "string"
    ? req.body.loadCapacity.trim()
    : typeof req.body.capacity === "string"
      ? req.body.capacity.trim()
      : "";

  const odometer = Number(req.body.odometer);
  const avgCost = Number(req.body.avgCost ?? req.body.acqCost);
  const status = normalizeVehicleStatus(req.body.status);

  if (!registrationNumber || !name || !vehicleType || !loadCapacity) {
    return res.status(400).json({ error: "Registration number, name, type, and load capacity are required" });
  }

  if (!Number.isFinite(odometer) || odometer < 0) {
    return res.status(400).json({ error: "Odometer must be a non-negative number" });
  }

  if (!Number.isFinite(avgCost) || avgCost < 0) {
    return res.status(400).json({ error: "Average cost must be a non-negative number" });
  }

  try {
    const result = await db.query(
      `UPDATE vehicles
       SET registration_number = $1,
           name = $2,
           vehicle_type = $3,
           load_capacity = $4,
           odometer = $5,
           avg_cost = $6,
           status = $7,
           updated_at = NOW()
       WHERE id = $8
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
      [registrationNumber, name, vehicleType, loadCapacity, odometer, avgCost, status, vehicleId]
    );

    const vehicle = result.rows[0];

    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    return res.json({ success: true, vehicle: mapVehicleRow(vehicle) });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({ error: "Vehicle registration number already exists" });
    }

    console.error("Update vehicle error:", error);
    return res.status(500).json({ error: "Failed to update vehicle" });
  }
});

router.delete("/vehicles/:id", protect, authorizeRoles("fleet_manager"), async (req, res) => {
  const vehicleId = Number(req.params.id);

  if (!Number.isFinite(vehicleId)) {
    return res.status(400).json({ error: "Invalid vehicle id" });
  }

  try {
    const result = await db.query(
      "DELETE FROM vehicles WHERE id = $1 RETURNING id",
      [vehicleId]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    return res.json({ success: true, message: "Vehicle deleted" });
  } catch (error) {
    console.error("Delete vehicle error:", error);
    return res.status(500).json({ error: "Failed to delete vehicle" });
  }
});

router.get("/me", protect, authorizeRoles("fleet_manager"), (req, res) => {
  res.json({
    message: "Fleet manager portal ready",
    user: req.user
  });
});

export default router;
