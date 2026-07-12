import express from "express";
import db from "../db.js";

const router = express.Router();

const normalizeStatus = (status) => {
  const value = String(status ?? "").trim().toLowerCase();
  return ["available", "on_trip", "off_duty", "suspended"].includes(value) ? value : "available";
};

const readString = (source, keys) => {
  for (const key of keys) {
    if (typeof source[key] === "string") {
      return source[key].trim();
    }
  }

  return "";
};

const readNumber = (source, keys) => {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null && source[key] !== "") {
      const rawValue = String(source[key]).trim().replace(/[%,$]/g, "");
      return Number(rawValue);
    }
  }

  return Number.NaN;
};

router.get("/", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id,
              name,
              license_number,
              license_category,
              license_expiry_date,
              contact_number,
              trip_completion_percentage,
              safety_score,
              status,
              created_at
       FROM drivers
       ORDER BY created_at DESC, id DESC`
    );

    return res.json({ success: true, data: { drivers: result.rows } });
  } catch (error) {
    console.error("Fetch drivers error:", error);
    return res.status(500).json({ success: false, message: "Failed to load drivers" });
  }
});

router.post("/", async (req, res) => {
  const name = readString(req.body, ["name", "driverName"]);
  const licenseNumber = readString(req.body, ["licenseNumber", "licenseNo"]);
  const licenseCategory = readString(req.body, ["licenseCategory", "category"]).toUpperCase();
  const licenseExpiry = readString(req.body, ["licenseExpiry", "licenseExpiryDate"]);
  const contact = readString(req.body, ["contact", "contactNumber"]) || null;
  const safety = readNumber(req.body, ["safetyScore", "safety"]);
  const tripCompletion = readNumber(req.body, ["tripCompletionPercentage", "tripCompletion"]);
  const status = normalizeStatus(req.body.status);

  if (!name || !licenseNumber || !licenseCategory || !licenseExpiry) {
    return res.status(400).json({ success: false, message: "Name, license number, category, and expiry are required" });
  }

  if (!Number.isFinite(safety) || safety < 0 || safety > 100) {
    return res.status(400).json({ success: false, message: "Safety score must be between 0 and 100" });
  }

  if (!Number.isFinite(tripCompletion) || tripCompletion < 0 || tripCompletion > 100) {
    return res.status(400).json({ success: false, message: "Trip completion must be between 0 and 100" });
  }

  try {
    const result = await db.query(
      `INSERT INTO drivers (
         name,
         license_number,
         license_category,
         license_expiry_date,
         contact_number,
         trip_completion_percentage,
         safety_score,
         status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id,
                 name,
                 license_number,
                 license_category,
                 license_expiry_date,
                 contact_number,
                 trip_completion_percentage,
                 safety_score,
                 status,
                 created_at`,
      [name, licenseNumber, licenseCategory, licenseExpiry, contact, tripCompletion, safety, status]
    );

    return res.status(201).json({ success: true, data: { driver: result.rows[0] } });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({ success: false, message: "License number already exists" });
    }

    console.error("Create driver error:", error);
    return res.status(500).json({ success: false, message: "Failed to create driver" });
  }
});

router.put("/:id", async (req, res) => {
  const driverId = Number(req.params.id);

  if (!Number.isFinite(driverId)) {
    return res.status(400).json({ success: false, message: "Invalid driver id" });
  }

  const name = readString(req.body, ["name", "driverName"]);
  const licenseNumber = readString(req.body, ["licenseNumber", "licenseNo"]);
  const licenseCategory = readString(req.body, ["licenseCategory", "category"]).toUpperCase();
  const licenseExpiry = readString(req.body, ["licenseExpiry", "licenseExpiryDate"]);
  const contact = readString(req.body, ["contact", "contactNumber"]) || null;
  const safety = readNumber(req.body, ["safetyScore", "safety"]);
  const tripCompletion = readNumber(req.body, ["tripCompletionPercentage", "tripCompletion"]);
  const status = normalizeStatus(req.body.status);

  try {
    const result = await db.query(
      `UPDATE drivers
       SET name = $1,
           license_number = $2,
           license_category = $3,
           license_expiry_date = $4,
           contact_number = $5,
           trip_completion_percentage = $6,
           safety_score = $7,
           status = $8
       WHERE id = $9
       RETURNING id,
                 name,
                 license_number,
                 license_category,
                 license_expiry_date,
                 contact_number,
                 trip_completion_percentage,
                 safety_score,
                 status,
                 created_at`,
      [name, licenseNumber, licenseCategory, licenseExpiry, contact, tripCompletion, safety, status, driverId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: "Driver not found" });
    }

    return res.json({ success: true, data: { driver: result.rows[0] } });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({ success: false, message: "License number already exists" });
    }

    console.error("Update driver error:", error);
    return res.status(500).json({ success: false, message: "Failed to update driver" });
  }
});

router.delete("/:id", async (req, res) => {
  const driverId = Number(req.params.id);

  if (!Number.isFinite(driverId)) {
    return res.status(400).json({ success: false, message: "Invalid driver id" });
  }

  try {
    const result = await db.query("DELETE FROM drivers WHERE id = $1 RETURNING id", [driverId]);

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: "Driver not found" });
    }

    return res.json({ success: true, message: "Driver deleted" });
  } catch (error) {
    console.error("Delete driver error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete driver" });
  }
});

export default router;