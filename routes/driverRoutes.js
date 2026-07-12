import express from "express";
import * as driverController from "../controllers/driverController.js";

const router = express.Router();

router.get("/", driverController.getAllDrivers);
router.get("/:id", driverController.getDriverById);
router.post("/", driverController.createDriver);
router.put("/:id", driverController.updateDriver);
router.delete("/:id", driverController.deleteDriver);
router.patch("/:id/status", driverController.updateDriverStatus);

export default router;