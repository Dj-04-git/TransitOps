import express from "express";
import * as maintenanceController from "../controllers/maintenanceController.js";

const router = express.Router();

router.get("/", maintenanceController.getAllMaintenanceRecords);
router.get("/:id", maintenanceController.getMaintenanceRecordById);
router.post("/", maintenanceController.createMaintenanceRecord);
router.patch("/:id/close", maintenanceController.closeMaintenanceRecord);

export default router;