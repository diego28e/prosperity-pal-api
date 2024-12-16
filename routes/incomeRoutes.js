import express from "express";
import {
  addIncome,
  getIncomeTags,
  editIncome,
} from "../controllers/incomeController.js";

const router = express.Router();

router.post("/add", addIncome);

router.get("/tags", getIncomeTags);

// Route to edit an income entry
router.patch("/edit/:id", editIncome);

export default router;
