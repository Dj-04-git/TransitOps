import db from "../db.js";

const getTrips = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT t.id,
              t.vehicle_id,
              v.registration_number AS vehicle_label,
              t.driver_id,
              d.name AS driver_name,
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
       LEFT JOIN drivers d ON d.id = t.driver_id
       ORDER BY t.created_at DESC, t.id DESC`
    );

    return res.json({ success: true, data: { trips: result.rows }, trips: result.rows });
  } catch (error) {
    console.error("Fetch trips error:", error);
    return res.status(500).json({ success: false, message: "Failed to load trips" });
  }
};

const createTrip = async (req, res) => {
  const source = String(req.body.source ?? "").trim();
  const destination = String(req.body.destination ?? "").trim();
  const vehicleId = Number(req.body.vehicleId ?? req.body.vehicle_id);
  const driverId = Number(req.body.driverId ?? req.body.driver_id);
  const cargoWeight = Number(req.body.cargoWeight ?? req.body.cargo_weight_kg);
  const distance = Number(req.body.distance ?? req.body.planned_distance_km);

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO trips (
         vehicle_id,
         driver_id,
         source,
         destination,
         cargo_weight_kg,
         planned_distance_km,
         status
       )
       VALUES ($1, $2, $3, $4, $5, $6, 'draft')
       RETURNING id,
                 vehicle_id,
                 driver_id,
                 source,
                 destination,
                 cargo_weight_kg,
                 planned_distance_km,
                 status,
                 created_at`,
      [vehicleId, driverId, source, destination, cargoWeight, distance]
    );

    await client.query("UPDATE vehicles SET status = 'on_trip' WHERE id = $1", [vehicleId]);
    await client.query("UPDATE drivers SET status = 'on_trip' WHERE id = $1", [driverId]);

    await client.query("COMMIT");

    return res.status(201).json({ success: true, data: { trip: result.rows[0] }, trip: result.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Create trip error:", error);
    return res.status(500).json({ success: false, message: "Failed to create trip" });
  } finally {
    client.release();
  }
};

const dispatchTrip = async (req, res) => {
  const tripId = Number(req.params.id);

  try {
    const tripResult = await db.query(
      `UPDATE trips
       SET status = 'dispatched',
           dispatched_at = NOW()
       WHERE id = $1
       RETURNING id, vehicle_id, driver_id`,
      [tripId]
    );

    const trip = tripResult.rows[0];
    if (!trip) {
      return res.status(404).json({ success: false, message: "Trip not found" });
    }

    await db.query("UPDATE vehicles SET status = 'on_trip' WHERE id = $1", [trip.vehicle_id]);
    await db.query("UPDATE drivers SET status = 'on_trip' WHERE id = $1", [trip.driver_id]);

    return res.json({ success: true, message: "Trip dispatched" });
  } catch (error) {
    console.error("Dispatch trip error:", error);
    return res.status(500).json({ success: false, message: "Failed to dispatch trip" });
  }
};

const completeTrip = async (req, res) => {
  const tripId = Number(req.params.id);

  try {
    const tripResult = await db.query(
      `UPDATE trips
       SET status = 'completed',
           completed_at = NOW()
       WHERE id = $1
       RETURNING id, vehicle_id, driver_id`,
      [tripId]
    );

    const trip = tripResult.rows[0];
    if (!trip) {
      return res.status(404).json({ success: false, message: "Trip not found" });
    }

    await db.query("UPDATE vehicles SET status = 'available' WHERE id = $1", [trip.vehicle_id]);
    await db.query("UPDATE drivers SET status = 'available' WHERE id = $1", [trip.driver_id]);

    return res.json({ success: true, message: "Trip completed" });
  } catch (error) {
    console.error("Complete trip error:", error);
    return res.status(500).json({ success: false, message: "Failed to complete trip" });
  }
};

const cancelTrip = async (req, res) => {
  const tripId = Number(req.params.id);

  try {
    const tripResult = await db.query(
      `UPDATE trips
       SET status = 'cancelled',
           cancelled_at = NOW()
       WHERE id = $1
       RETURNING id, vehicle_id, driver_id`,
      [tripId]
    );

    const trip = tripResult.rows[0];
    if (!trip) {
      return res.status(404).json({ success: false, message: "Trip not found" });
    }

    await db.query("UPDATE vehicles SET status = 'available' WHERE id = $1", [trip.vehicle_id]);
    await db.query("UPDATE drivers SET status = 'available' WHERE id = $1", [trip.driver_id]);

    return res.json({ success: true, message: "Trip cancelled" });
  } catch (error) {
    console.error("Cancel trip error:", error);
    return res.status(500).json({ success: false, message: "Failed to cancel trip" });
  }
};

export default {
  getTrips,
  createTrip,
  dispatchTrip,
  completeTrip,
  cancelTrip
};
