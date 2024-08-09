import db from "../config/db.js";
import moment from "moment";

export const addExpense = async (req, res) => {
  const { amount, date, tag_name } = req.body;
  const user_id = req.user.id;

  // Log the values received from the frontend
  console.log("Received values from frontend:");
  console.log("Amount:", amount);
  console.log("Date:", date);
  console.log("Tag Name:", tag_name);
  console.log("User ID:", user_id);

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
    console.log("Tag ID:", tag_id);

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

//Fetch expenses for the current month
export const getExpensesForCurrentMonth = async (req, res) => {
  const user_id = req.user.id;
  const startOfMonth = moment().startOf("month").format("YYYY-MM-DD");
  const endOfMonth = moment().endOf("month").format("YYYY-MM-DD");

  try {
    console.log(
      `Fetching expenses for user_id: ${user_id} between ${startOfMonth} and ${endOfMonth}`
    );

    //Fetch expenses
    const expensesResult = await db.query(
      `SELECT expenses.amount, expenses.date, expensetags.name AS tag_name
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

    //Log the data retrieved from the database
    console.log("Expenses retrieved from databse:", expenses);
    console.log("total expenses:", totalExpenses);

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
