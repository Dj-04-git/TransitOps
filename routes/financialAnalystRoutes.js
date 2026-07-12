import express from "express";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/me", protect, authorizeRoles("financial_analyst"), (req, res) => {
  res.json({
    message: "Financial analyst portal ready",
    user: req.user
  });
});

export default router;
