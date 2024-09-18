const { pool } = require("../models/database"); // Correctly import pool

// Handles Razorpay payment method via webhook
async function paymentMethodHandler(req, res) {
  try {
    const razorpayPayload = req.body;
    const { event, payload: { payment: { entity } } } = razorpayPayload;

    const {
      id: payment_id, amount, currency, status, order_id, invoice_id,
      international, method, amount_refunded, refund_status, captured,
      description, card_id, bank, wallet, vpa, email, contact,
      notes: { name, type }
    } = entity;

    // Query database for existing payment
    const logQuery = `SELECT payment_id, status FROM rzp_payments WHERE payment_id = $1`;
    const existingLogPromise = pool.query(logQuery, [payment_id]);

    const [existingLogResult] = await Promise.all([existingLogPromise]);

    if (existingLogResult.rowCount > 0) {
      if (existingLogResult.rows[0].status !== "captured") {
        const updateQuery = `UPDATE rzp_payments SET status = $1 WHERE payment_id = $2`;
        await pool.query(updateQuery, [status, payment_id]);
      } else {
        return res.status(200).json({ status: "success", message: "Payment already captured" });
      }
    } else {
      // Insert new payment into the database
      const insertQuery = `INSERT INTO rzp_payments 
        (payment_id, amount, currency, status, order_id, invoice_id, international, method, 
         amount_refunded, refund_status, captured, description, card_id, bank, wallet, vpa, 
         email, contact, name, type)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`;
      await pool.query(insertQuery, [
        payment_id, amount, currency, status, order_id, invoice_id, international, method, 
        amount_refunded, refund_status, captured, description, card_id, bank, wallet, vpa, 
        email, contact, name, type
      ]);
    }

    if (status === "captured" && event === "payment.captured") {
      return res.status(200).json({ status: "success", message: "Payment processed successfully" });
    } else {
      return res.status(200).json({ status: "success", message: "Already Captured Payment" });
    }
  } catch (error) {
    console.error(`Error processing Razorpay webhook: ${error.message}`);
    return res.status(500).json({ status: "error", error: "Internal Server Error" });
  }
}

// Fetch captured payment data for the user
async function getUserData(req, res) {
  try {
    const getAllUserData = `
      SELECT payment_id, amount, order_id, email, contact 
      FROM rzp_payments 
      WHERE status = 'captured'
    `;

    const existingLogResult = await pool.query(getAllUserData);

    if (existingLogResult.rowCount > 0) {
      res.status(200).json({ success: true, data: existingLogResult.rows });
    } else {
      res.status(404).json({ success: false, message: "No captured payments found" });
    }
  } catch (error) {
    console.error("Error fetching user data:", error.message);
    res.status(500).json({ success: false, message: "An error occurred while fetching user data", error: error.message });
  }
}

module.exports = {
  paymentMethodHandler,
  getUserData,
};
