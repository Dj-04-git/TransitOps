import db from "../db.js";

const getMaintenanceLogs = async (req, res) => {
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

    return res.json({ success: true, data: { records: result.rows }, maintenanceLogs: result.rows });
  } catch (error) {
    console.error("Fetch maintenance logs error:", error);
    return res.status(500).json({ success: false, message: "Failed to load maintenance logs" });
  }
};

const createMaintenanceLog = async (req, res) => {
  const vehicleId = Number(req.body.vehicle_id ?? req.body.vehicle);
  const serviceType = String(req.body.service_type ?? req.body.serviceType ?? "").trim();
  const cost = Number(req.body.cost);
  const startedAt = req.body.started_at ?? req.body.date;
  const statusInput = String(req.body.status ?? "open").trim().toLowerCase();
  const status = statusInput === "completed" ? "completed" : "active";
  const completedAt = status === "completed" ? startedAt : null;

  if (!Number.isFinite(vehicleId)) {
    return res.status(400).json({ success: false, message: "Invalid vehicle id" });
  }

  if (!serviceType) {
    return res.status(400).json({ success: false, message: "Service type is required" });
  }

  if (!Number.isFinite(cost) || cost < 0) {
    return res.status(400).json({ success: false, message: "Cost must be a non-negative number" });
  }

  try {
    const result = await db.query(
      `INSERT INTO maintenance_logs (
         vehicle_id,
         service_type,
         cost,
         started_at,
         completed_at,
         status
       )
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id,
                 vehicle_id,
                 service_type,
                 cost,
                 started_at,
                 completed_at,
                 status,
                 created_at`,
      [vehicleId, serviceType, cost, startedAt, completedAt, status]
    );

    await db.query(
      "UPDATE vehicles SET status = $1 WHERE id = $2",
      [status === "completed" ? "available" : "in_shop", vehicleId]
    );

    return res.status(201).json({ success: true, data: { record: result.rows[0] }, record: result.rows[0] });
  } catch (error) {
    console.error("Create maintenance log error:", error);
    return res.status(500).json({ success: false, message: "Failed to save maintenance log" });
  }
};

const closeMaintenanceLog = async (req, res) => {
  const recordId = Number(req.params.id);

  if (!Number.isFinite(recordId)) {
    return res.status(400).json({ success: false, message: "Invalid maintenance log id" });
  }

  try {
    const result = await db.query(
      `UPDATE maintenance_logs
       SET status = 'completed',
           completed_at = NOW()
       WHERE id = $1
       RETURNING id, vehicle_id`,
      [recordId]
    );

    const record = result.rows[0];
    if (!record) {
      return res.status(404).json({ success: false, message: "Maintenance log not found" });
    }

    await db.query("UPDATE vehicles SET status = 'available' WHERE id = $1", [record.vehicle_id]);

    return res.json({ success: true, message: "Maintenance log closed" });
  } catch (error) {
    console.error("Close maintenance log error:", error);
    return res.status(500).json({ success: false, message: "Failed to close maintenance log" });
  }
};

export default {
  getMaintenanceLogs,
  createMaintenanceLog,
  closeMaintenanceLog
};