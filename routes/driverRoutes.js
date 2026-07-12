import express from "express";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/me", protect, authorizeRoles("driver"), (req, res) => {
  res.json({
    message: "Driver portal ready",
    user: req.user
  });
});

export default router;
