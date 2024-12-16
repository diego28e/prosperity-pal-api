import db from "../config/db.js";
import { DateTime } from "luxon";

export const addIncome = async (req, res) => {
  const { amount, date, tag_name } = req.body;
  const user_id = req.user.id;

  try {
    // Insert the tag if it doesn't exist
    await db.query(
      `INSERT INTO incometags (user_id, name) 
             VALUES ($1, $2) 
             ON CONFLICT (user_id, name) DO NOTHING`,
      [user_id, tag_name.trim()]
    );

    // Retrieve the tag_id for the given tag_name
    const tagResult = await db.query(
      "SELECT id FROM incometags WHERE user_id = $1 AND name = $2",
      [user_id, tag_name.trim()]
    );

    if (tagResult.rows.length === 0) {
      console.log("Tag not found in incometags table.");
      return res.status(400).send("Invalid tag name.");
    }

    const tag_id = tagResult.rows[0].id;

    // Insert the income entry with the retrieved tag_id
    await db.query(
      "INSERT INTO income (user_id, amount, date, tag_id) VALUES ($1, $2, $3, $4)",
      [user_id, amount, date, tag_id]
    );
    res.redirect("/secrets");
  } catch (err) {
    console.error("Database insertion error:", err);
    res.status(500).send("Server error");
  }
};

// Edit an existing income entry (PATCH request)
export const editIncome = async (req, res) => {
  const { id } = req.params;
  const { amount, date, tag_name } = req.body;
  const user_id = req.user.id;

  try {
    // Check if the income entry exists for this user
    const incomeResult = await db.query(
      "SELECT * FROM income WHERE id = $1 AND user_id = $2",
      [id, user_id]
    );

    if (incomeResult.rows.length === 0) {
      console.log("Income entry not found");
      return res.status(404).send("Income entry not found");
    }

    let tag_id;
    if (tag_name) {
      // Insert the tag if it doesn't exist
      await db.query(
        `INSERT INTO incometags (user_id, name) 
               VALUES ($1, $2) 
               ON CONFLICT (user_id, name) DO NOTHING`,
        [user_id, tag_name.trim()]
      );

      // Retrieve the tag_id for the given tag_name
      const tagResult = await db.query(
        "SELECT id FROM incometags WHERE user_id = $1 AND name = $2",
        [user_id, tag_name.trim()]
      );

      if (tagResult.rows.length === 0) {
        console.log("Tag name not found or invalid");
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
      const updateQuery = `UPDATE income SET ${fieldsToUpdate.join(
        ", "
      )} WHERE id = $${fieldsToUpdate.length + 1} AND user_id = $${
        fieldsToUpdate.length + 2
      }`;

      // Update the income entry with dynamic query
      await db.query(updateQuery, queryValues);
      console.log("Income updated successfully");
    }

    res.status(200).send("Income updated successfully");
  } catch (err) {
    console.error("Database update error:", err);
    res.status(500).send("Server error");
  }
};

export const deleteIncome = async (req, res) => {
  const incomeId = req.params.id;
  const user_id = req.user.id;

  try {
    await db.query("DELETE FROM income WHERE id = $1 AND user_id = $2", [
      incomeId,
      user_id,
    ]);
    res.redirect("/secrets");
  } catch (err) {
    console.error("Database deletion error:", err);
    res.status(500).send("Server error");
  }
};

// Fetch incomes for the current month
export const getIncomesForCurrentMonth = async (req, res) => {
  const user_id = req.user.id;
  const { month, year } = req.query;

  const startOfMonth = DateTime.fromObject({ year, month, day: 1 })
    .startOf("month")
    .toISODate();
  const endOfMonth = DateTime.fromObject({ year, month, day: 1 })
    .endOf("month")
    .toISODate();

  try {
    const incomesResult = await db.query(
      `SELECT income.id, income.amount, income.date, incometags.name AS tag_name
       FROM income
       JOIN incometags ON income.tag_id = incometags.id
       WHERE income.user_id = $1 AND income.date BETWEEN $2 AND $3
       ORDER BY income.date`,
      [user_id, startOfMonth, endOfMonth]
    );

    const incomes = incomesResult.rows;
    const totalIncome = incomes.reduce(
      (total, income) => total + parseFloat(income.amount),
      0
    );

    return { incomes, totalIncome };
  } catch (err) {
    console.error("Database query error:", err);
    return { incomes: [], totalIncome: 0 };
  }
};

export const getIncomeTags = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM incometags WHERE user_id = $1",
      [req.user.id]
    );
    return result.rows;
  } catch (err) {
    console.error(err);
    throw err;
  }
};
