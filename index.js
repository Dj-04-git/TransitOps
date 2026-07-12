
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

import express from "express";
import cors from "cors";
import { config } from "./config.js";
import ejsMate from 'ejs-mate';
import db, { initDatabase } from "./db.js";

import authRoutes from "./routes/authRoutes.js";
import publicApiRoutes from "./routes/publicApiRoutes.js";
import fleetManagerRoutes from "./routes/fleetManagerRoutes.js";
import driversRoutes from "./routes/driversRoutes.js";
import driverRoutes from "./routes/driverRoutes.js";
import safetyOfficerRoutes from "./routes/safetyOfficerRoutes.js";
import financialAnalystRoutes from "./routes/financialAnalystRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
// Set view engine to EJS
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'pages'));

// Serve static files from pages folder
app.use(express.static(path.join(__dirname, "pages")));

app.use("/api/auth", authRoutes);
app.use("/api", publicApiRoutes);
app.use("/api/fleet-manager", fleetManagerRoutes);
app.use("/api/drivers", driversRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/safety-officer", safetyOfficerRoutes);
app.use("/api/financial-analyst", financialAnalystRoutes);

app.get("/api/vehicles", async (req, res) => {
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
    console.error("Fetch vehicles error:", error);
    return res.status(500).json({ success: false, message: "Failed to load vehicles" });
  }
});

app.get("/api/trips", async (req, res) => {
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
    console.error("Fetch trips error:", error);
    return res.status(500).json({ success: false, message: "Failed to load trips" });
  }
});

app.get("/api/fuel", async (req, res) => {
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
    console.error("Fetch fuel logs error:", error);
    return res.status(500).json({ success: false, message: "Failed to load fuel logs" });
  }
});

app.post("/api/fuel", async (req, res) => {
  try {
    const vehicleId = Number(req.body.vehicle_id ?? req.body.vehicle);
    const tripId = req.body.trip_id != null && req.body.trip_id !== "" ? Number(req.body.trip_id) : null;
    const liters = Number(req.body.liters ?? req.body.quantity);
    const cost = Number(req.body.cost);
    const refueledAt = req.body.refueled_at ?? req.body.date;

    const result = await db.query(
      `INSERT INTO fuel_logs (vehicle_id, trip_id, liters, cost, refueled_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, vehicle_id, trip_id, liters, cost, refueled_at, created_at`,
      [vehicleId, tripId, liters, cost, refueledAt]
    );

    return res.status(201).json({ success: true, fuelLog: result.rows[0] });
  } catch (error) {
    console.error("Create fuel log error:", error);
    return res.status(500).json({ success: false, message: "Failed to save fuel log" });
  }
});

app.get("/api/maintenance", async (req, res) => {
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
    console.error("Fetch maintenance logs error:", error);
    return res.status(500).json({ success: false, message: "Failed to load maintenance logs" });
  }
});

app.get("/api/expenses", async (req, res) => {
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
    console.error("Fetch expenses error:", error);
    return res.status(500).json({ success: false, message: "Failed to load expenses" });
  }
});

app.post("/api/expenses", async (req, res) => {
  try {
    const tripId = Number(req.body.trip_id ?? req.body.trip);
    const vehicleId = Number(req.body.vehicle_id ?? req.body.vehicle);
    const toll = Number(req.body.toll) || 0;
    const other = Number(req.body.other ?? req.body.misc) || 0;
    const maintenanceCost = Number(req.body.maintenance_cost) || 0;
    const fuelCost = Number(req.body.fuel_cost) || 0;
    const totalCost = Number(req.body.total_cost) || toll + other + maintenanceCost + fuelCost;
    const expenseDate = req.body.expense_date ?? req.body.date;

    const result = await db.query(
      `INSERT INTO expenses (
         trip_id,
         vehicle_id,
         toll,
         other,
         maintenance_cost,
         fuel_cost,
         total_cost,
         expense_date
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, trip_id, vehicle_id, toll, other, maintenance_cost, fuel_cost, total_cost, expense_date, created_at`,
      [tripId, vehicleId, toll, other, maintenanceCost, fuelCost, totalCost, expenseDate]
    );

    return res.status(201).json({ success: true, expense: result.rows[0] });
  } catch (error) {
    console.error("Create expense error:", error);
    return res.status(500).json({ success: false, message: "Failed to save expense" });
  }
});

app.get("/api/health/db", async (req, res) => {
  try {
    const result = await db.query("SELECT NOW() AS server_time");
    return res.json({
      ok: true,
      message: "Database connected",
      serverTime: result.rows[0].server_time
    });
  } catch (error) {
    console.error("Database health check failed:", error);
    return res.status(500).json({
      ok: false,
      message: "Database connection failed"
    });
  }
});


// Serve pages
app.get("/", (req, res) => {
    res.render("index");
});

app.get("/login", (req, res) => {
    res.render("new-login");
});

app.get("/register", (req, res) => {
    res.render("new-register");
});

app.get("/registry", (req, res) => {
  res.render("registry");
});

app.get("/verify-otp", (req, res) => {
    res.render("verify-otp");
});

app.get("/forgot-password", (req, res) => {
    res.render("forgot-password");
});

app.get("/reset-password", (req, res) => {
    res.render("reset-password");
});

app.get("/dashboard", (req, res) => {
  res.render("dashboard");
});

app.get("/fleet", (req, res) => {
  res.render("fleet");
});
 
app.get("/drivers", (req, res) => {
  res.render("drivers");
});

app.get("/trips", (req, res) => {
  res.render("trips");
});
app.get("/maintenance", (req, res) => {
  res.render("maintenance");
});
app.get("/fuel-expenses", (req, res) => {
  res.render("fuel-expenses");
});
app.get("/analytics", (req, res) => {
  res.render("analytics");
});
app.get("/settings", (req, res) => {
  res.render("settings");
});



const startServer = async () => {
  try {
    await initDatabase();
    console.log("PostgreSQL connection and schema initialization successful");

    app.listen(config.PORT, () => {
      console.log(`Server running on port ${config.PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to PostgreSQL:", error);
    process.exit(1);
  }
};

startServer();
