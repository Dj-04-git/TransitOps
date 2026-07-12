import express from "express";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/me", protect, authorizeRoles("safety_officer"), (req, res) => {
  res.json({
    message: "Safety officer portal ready",
    user: req.user
  });
});

export default router;
