import express from "express";
import {
  addExpense,
  getExpenseTags,
  editExpense,
} from "../controllers/expenseController.js";

const router = express.Router();

router.post("/add", addExpense);

router.get("/tags", getExpenseTags);

// Route to edit an expense entry
router.patch("/edit/:id", editExpense);

export default router;
