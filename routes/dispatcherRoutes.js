import express from "express";

import dashboardController from "../controllers/dashboardController.js";
import dispatcherController from "../controllers/dispatcherController.js";
import vehicleController from "../controllers/vehicleController.js";
import tripController from "../controllers/tripController.js";
import fuelController from "../controllers/fuelController.js";
import expenseController from "../controllers/expenseController.js";

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({ message: "Dispatcher routes are available" });
});




router.get("/", dispatcherController.getAllDrivers);
router.get("/:id", dispatcherController.getDriverById);
router.post("/", dispatcherController.createDriver);
router.put("/:id", dispatcherController.updateDriver);
router.delete("/:id", dispatcherController.deleteDriver);
router.patch("/:id/status", dispatcherController.updateDriverStatus);

export default router;
