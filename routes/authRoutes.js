import express from "express";
import {
  register,
  getRoles,
  login,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile
} from "../controller/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/roles", getRoles);
router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", protect, getProfile);
router.put("/me", protect, updateProfile);
router.get("/profile/:id", protect, getProfile);
router.put("/profile/:id", protect, updateProfile);

export default router;
