import express from "express";
import * as fuelController from "../controllers/fuelController.js";

const router = express.Router();

router.get("/", fuelController.getAllFuelRecords);
router.get("/:id", fuelController.getFuelRecordById);
router.post("/", fuelController.createFuelRecord);

export default router;