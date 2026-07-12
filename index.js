
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
import fleetManagerRoutes from "./routes/fleetManagerRoutes.js";
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
app.use("/api/fleet-manager", fleetManagerRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/safety-officer", safetyOfficerRoutes);
app.use("/api/financial-analyst", financialAnalystRoutes);

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
