import express from "express";
import * as dispatcherController from "../controllers/dispatcherController.js";

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
