
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

import express from "express";
import cors from "cors";
import vehicleRoutes from "./routes/vehicleRoutes.js";
//import authRoutes from "./routes/authRoutes.js";
 
import driverRoutes from "./routes/driverRoutes.js";
import tripRoutes from "./routes/tripRoutes.js";
import maintenanceRoutes from "./routes/maintenanceRoutes.js";
import fuelRoutes from "./routes/fuelRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/fuel", fuelRoutes);
app.use("/api/expenses", expenseRoutes);
// Set view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'pages'));

// Serve static files from pages folder
app.use(express.static(path.join(__dirname, "pages")));

//app.use("/api/auth", authRoutes);


// Serve pages
app.get("/", (req, res) => {
  res.render("login");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
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

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
