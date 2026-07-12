import express from "express";

import dashboardController from "../controllers/dashboardController.js";
import dispatcherController from "../controllers/dispatcherController.js";
import vehicleController from "../controllers/vehicleController.js";
import tripController from "../controllers/tripController.js";
import fuelController from "../controllers/fuelController.js";
import expenseController from "../controllers/expenseController.js";

const router = express.Router();

/* ============================================================
   DASHBOARD
============================================================ */

router.get("/dashboard", dashboardController.renderDashboard);


/* ============================================================
   DISPATCHER PROFILE
============================================================ */

router.get("/profile", dispatcherController.getProfile);
router.put("/profile", dispatcherController.updateProfile);


/* ============================================================
   VEHICLES (Read Only)
============================================================ */

router.get("/vehicles", vehicleController.getAllVehicles);

router.get("/vehicles/:id", vehicleController.getVehicleById);


/* ============================================================
   TRIPS
============================================================ */

router.get("/trips", tripController.getAllTrips);

router.get("/trips/create", tripController.renderCreateTripPage);

router.get("/trips/:id", tripController.getTripById);

router.get("/trips/:id/edit", tripController.renderEditTripPage);

router.post("/trips", tripController.createTrip);

router.put("/trips/:id", tripController.updateTrip);

router.patch("/trips/:id/dispatch", tripController.dispatchTrip);

router.patch("/trips/:id/complete", tripController.completeTrip);

router.patch("/trips/:id/cancel", tripController.cancelTrip);

router.delete("/trips/:id", tripController.deleteTrip);


/* ============================================================
   FUEL LOGS
============================================================ */

router.get("/fuel", fuelController.getAllFuelLogs);

router.get("/fuel/create", fuelController.renderCreateFuelPage);

router.get("/fuel/:id", fuelController.getFuelLogById);

router.post("/fuel", fuelController.createFuelLog);


/* ============================================================
   EXPENSES
============================================================ */

router.get("/expenses", expenseController.getAllExpenses);

router.get("/expenses/create", expenseController.renderCreateExpensePage);

router.get("/expenses/:id", expenseController.getExpenseById);

router.post("/expenses", expenseController.createExpense);

export default router;