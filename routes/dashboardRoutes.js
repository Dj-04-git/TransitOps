import express from "express";
import * as dashboardController from "../controllers/dashboardController.js";

const router = express.Router();

router.get("/", dashboardController.getDashboard);
router.get("/kpis", dashboardController.getKpis);
router.get("/analytics", dashboardController.getAnalytics);
router.get("/reports", dashboardController.getReports);

export default router;