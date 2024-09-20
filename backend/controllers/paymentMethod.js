const { pool } = require("../models/database");
const Razorpay = require("razorpay");
const axios = require('axios');
const { validateWebhookSignature } = require("razorpay/dist/utils/razorpay-utils");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create Payment
async function createPayment(req, res) {
  try {
    const { amount } = req.body;
    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {},
    };

    const order = await razorpay.orders.create(options);

    const queryText = `
      INSERT INTO orders (order_id, amount, currency, receipt, status)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `;

    const values = [order.id, amount, order.currency, order.receipt, "created"];
    await pool.query(queryText, values);

    res.status(200).json(order);
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ error: "Failed to create Razorpay order" });
  }
}

// Verify Payment
async function verifyPayment(req, res) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const body = razorpay_order_id + "|" + razorpay_payment_id;

  try {
    const isValidSignature = validateWebhookSignature(
      body,
      razorpay_signature,
      process.env.RAZORPAY_KEY_SECRET,
    );

    if (isValidSignature) {
      const queryText = `
        UPDATE orders
        SET status = $1, payment_id = $2
        WHERE order_id = $3 RETURNING *
      `;
      const values = ["paid", razorpay_payment_id, razorpay_order_id];
      const dbRes = await pool.query(queryText, values);

      if (dbRes.rowCount > 0) {
        res.status(200).json({ status: "ok" });
      } else {
        res.status(400).json({ status: "order_not_found" });
      }
    } else {
      res.status(400).json({ status: "verification_failed" });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ status: "error", message: "Error verifying payment" });
  }
}

// Refund Payment
async function refundPayment(paymentId, amount) {
  try {
    const response = await axios.post(
      'https://api.razorpay.com/v1/refunds',
      {
        payment_id: paymentId,
        amount: amount * 100,
      },
      {
        auth: {
          username: process.env.RAZORPAY_KEY_ID,
          password: process.env.RAZORPAY_KEY_SECRET,
        },
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Refund successful:', response.data);

    const refundQueryText = `
      INSERT INTO refund (
        refund_id, amount, currency, payment_id, status, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `;
    
    const refundValues = [
      response.data.id,
      response.data.amount / 100,
      response.data.currency,
      response.data.payment_id,
      response.data.status,
      new Date(response.data.created_at * 1000)
    ];
    
    await pool.query(refundQueryText, refundValues);

    return response.data;
  } catch (error) {
    console.error('Error initiating refund:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// Payment Refund Endpoint
async function paymentRefund(req, res) {
  const { paymentId, amount } = req.body;

  try {
    const refund = await refundPayment(paymentId, amount);

    res.status(200).json({
      message: "Refund initiated successfully",
      refund,
    });
  } catch (error) {
    console.error("Error initiating refund:", error.message);
    res.status(500).json({
      message: "Failed to initiate refund",
      error: error.message,
    });
  }
}

// Fetch All Orders Details
async function getAllOrders(req, res) {
  try {
    const queryText = 'SELECT * FROM orders ORDER BY id DESC';
    const dbRes = await pool.query(queryText);

    if (dbRes.rows.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    res.status(200).json({ success: true, data: dbRes.rows });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ success: false, error: "Failed to fetch orders" });
  }
}

module.exports = {
  verifyPayment,
  createPayment,
  paymentRefund,
  getAllOrders
};
