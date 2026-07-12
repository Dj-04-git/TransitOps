import express from "express";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/me", protect, authorizeRoles("fleet_manager"), (req, res) => {
  res.json({
    message: "Fleet manager portal ready",
    user: req.user
  });
});

export default router;
