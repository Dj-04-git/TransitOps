import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

import express from "express";
import cors from "cors";

import authRoutes from "./routes/authRoutes.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Set view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'pages'));

// Serve static files from pages folder
app.use(express.static(path.join(__dirname, "pages")));

app.use("/api/auth", authRoutes);


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



app.listen(5000, () => {
  console.log("Server running on port 5000");
});
