import express from "express";
import * as expenseController from "../controllers/expenseController.js";

const router = express.Router();

router.get("/", expenseController.getAllExpenses);
router.get("/:id", expenseController.getExpenseById);
router.post("/", expenseController.createExpense);
router.delete("/:id", expenseController.deleteExpense);

export default router;