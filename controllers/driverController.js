import db from "../db.js";

const getAvailableDrivers = async (req, res) => {
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
       WHERE status = 'available'
         AND license_expiry_date >= CURRENT_DATE
       ORDER BY created_at DESC, id DESC`
    );

    return res.json({ success: true, data: { drivers: result.rows }, drivers: result.rows });
  } catch (error) {
    console.error("Fetch available drivers error:", error);
    return res.status(500).json({ success: false, message: "Failed to load available drivers" });
  }
};

export default {
  getAvailableDrivers
};
