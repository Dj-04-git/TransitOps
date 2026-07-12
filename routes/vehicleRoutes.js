import express from "express";
import * as vehicleController from "../controllers/vehicleController.js";

const router = express.Router();

router.get("/", vehicleController.getAllVehicles);
router.get("/:id", vehicleController.getVehicleById);
router.post("/", vehicleController.createVehicle);
router.put("/:id", vehicleController.updateVehicle);
router.delete("/:id", vehicleController.deleteVehicle);
router.patch("/:id/status", vehicleController.updateVehicleStatus);

export default router;