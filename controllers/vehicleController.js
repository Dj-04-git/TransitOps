import db from "../db.js";

const getAvailableVehicles = async (req, res) => {
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
       WHERE status = 'available'
       ORDER BY created_at DESC, id DESC`
    );

    return res.json({ success: true, data: { vehicles: result.rows }, vehicles: result.rows });
  } catch (error) {
    console.error("Fetch available vehicles error:", error);
    return res.status(500).json({ success: false, message: "Failed to load available vehicles" });
  }
};

export default {
  getAvailableVehicles
};
