import db from "../config/db.js";
import { DateTime } from "luxon";

export const addExpense = async (req, res) => {
  const { amount, date, tag_name } = req.body;
  const user_id = req.user.id;

  try {
    // Insert the tag if it doesn't exist
    await db.query(
      `INSERT INTO expensetags (user_id, name) 
           VALUES ($1, $2) 
           ON CONFLICT (user_id, name) DO NOTHING`,
      [user_id, tag_name.trim()]
    );

    // Retrieve the tag_id for the given tag_name
    const tagResult = await db.query(
      "SELECT id FROM expensetags WHERE user_id = $1 AND name = $2",
      [user_id, tag_name.trim()]
    );

    if (tagResult.rows.length === 0) {
      console.log("Tag not found in expensetags table.");
      return res.status(400).send("Invalid tag name.");
    }

    const tag_id = tagResult.rows[0].id;

    // Insert the expense entry with the retrieved tag_id
    await db.query(
      "INSERT INTO expenses (user_id, amount, date, tag_id) VALUES ($1, $2, $3, $4)",
      [user_id, amount, date, tag_id]
    );
    res.redirect("/secrets");
  } catch (err) {
    console.error("Database insertion error:", err);
    res.redirect("/secrets");
  }
};

// Edit an existing expense entry (PATCH request)
export const editExpense = async (req, res) => {
  const { id } = req.params;
  const { amount, date, tag_name } = req.body;
  const user_id = req.user.id;

  try {
    // Check if the expense entry exists for this user
    const expenseResult = await db.query(
      "SELECT * FROM expenses WHERE id = $1 AND user_id = $2",
      [id, user_id]
    );

    if (expenseResult.rows.length === 0) {
      return res.status(404).send("Expense entry not found");
    }

    let tag_id;
    if (tag_name) {
      // Insert the tag if it doesn't exist
      await db.query(
        `INSERT INTO expensetags (user_id, name) 
               VALUES ($1, $2) 
               ON CONFLICT (user_id, name) DO NOTHING`,
        [user_id, tag_name.trim()]
      );

      // Retrieve the tag_id for the given tag_name
      const tagResult = await db.query(
        "SELECT id FROM expensetags WHERE user_id = $1 AND name = $2",
        [user_id, tag_name.trim()]
      );

      if (tagResult.rows.length === 0) {
        return res.status(400).send("Invalid tag name");
      }

      tag_id = tagResult.rows[0].id;
    }

    // Build the query dynamically based on the provided fields
    const fieldsToUpdate = [];
    const queryValues = [];
    if (amount) {
      fieldsToUpdate.push(`amount = $${fieldsToUpdate.length + 1}`);
      queryValues.push(amount);
    }
    if (date) {
      fieldsToUpdate.push(`date = $${fieldsToUpdate.length + 1}`);
      queryValues.push(date);
    }
    if (tag_id) {
      fieldsToUpdate.push(`tag_id = $${fieldsToUpdate.length + 1}`);
      queryValues.push(tag_id);
    }
    queryValues.push(id, user_id);

    if (fieldsToUpdate.length > 0) {
      const updateQuery = `UPDATE expenses SET ${fieldsToUpdate.join(
        ", "
      )} WHERE id = $${fieldsToUpdate.length + 1} AND user_id = $${
        fieldsToUpdate.length + 2
      }`;

      // Update the expense entry with dynamic query
      await db.query(updateQuery, queryValues);
    }

    res.status(200).send("Expense updated successfully");
  } catch (err) {
    console.error("Database update error:", err);
    res.status(500).send("Server error");
  }
};

export const deleteExpense = async (req, res) => {
  const expenseId = req.params.id;
  const user_id = req.user.id;

  try {
    await db.query("DELETE FROM expenses WHERE id = $1 AND user_id = $2", [
      expenseId,
      user_id,
    ]);
    res.redirect("/secrets");
  } catch (err) {
    console.error("Database deletion error", err);
    res.status(500).send("Server error");
  }
};

// Fetch expenses for the current month
export const getExpensesForCurrentMonth = async (req, res) => {
  const user_id = req.user.id;
  const { month, year } = req.query;

  // Use Luxon to get the start and end of the month
  const startOfMonth = DateTime.fromObject({ year, month, day: 1 })
    .startOf("month")
    .toISODate();
  const endOfMonth = DateTime.fromObject({ year, month, day: 1 })
    .endOf("month")
    .toISODate();

  try {
    // Fetch expenses
    const expensesResult = await db.query(
      `SELECT expenses.id, expenses.amount, expenses.date, expensetags.name AS tag_name
      FROM expenses
      JOIN expensetags ON expenses.tag_id = expensetags.id
      WHERE expenses.user_id = $1 AND expenses.date BETWEEN $2 AND $3
      ORDER BY expenses.date`,
      [user_id, startOfMonth, endOfMonth]
    );

    const expenses = expensesResult.rows;
    const totalExpenses = expenses.reduce(
      (total, expense) => total + parseFloat(expense.amount),
      0
    );

    return { expenses, totalExpenses };
  } catch (err) {
    console.error("Database query error:", err);
    return { expenses: [], totalExpenses: 0 };
  }
};

export const getExpenseTags = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM expensetags WHERE user_id = $1",
      [req.user.id]
    );
    return result.rows;
  } catch (err) {
    console.error(err);
    throw err;
  }
};
