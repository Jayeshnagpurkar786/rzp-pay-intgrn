const { pool } = require("../models/database");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const axios = require("axios");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Payment
exports.createPayment = async (req, res) => {
  try {
    const { amount } = req.body;

    // Log the received amount
    console.log("Received amount:", amount);

    const options = {
      amount: amount * 100, // Amount in paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`
    };

    // Create order with Razorpay
    const order = await razorpay.orders.create(options);

    // Insert into database
    const queryText = `INSERT INTO orders (order_id, amount, currency, receipt, status) VALUES ($1, $2, $3, $4, $5) RETURNING *`;
    const values = [order.id, amount, order.currency, order.receipt, "created"];
    await pool.query(queryText, values);

    // Respond with the created order
    res.status(200).json(order);
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({ error: "Failed to create Razorpay order", details: error.message });
  }
};

// Utility function for validating Razorpay signature
function validateSignature(orderId, paymentId, signature, secret) {
  const generatedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return generatedSignature === signature;
}

// Verify Payment
exports.verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ status: "error", message: "Missing required parameters" });
  }

  try {
    const isValidSignature = validateSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, process.env.RAZORPAY_KEY_SECRET);

    if (isValidSignature) {
      const queryText = `UPDATE orders SET status = $1, payment_id = $2 WHERE order_id = $3 RETURNING *`;
      const values = ["paid", razorpay_payment_id, razorpay_order_id];
      const dbRes = await pool.query(queryText, values);

      if (dbRes.rowCount === 0) {
        return res.status(404).json({ status: "error", message: "Order not found" });
      }

      return res.status(200).json({ status: "ok", data: dbRes.rows[0] });
    } else {
      return res.status(400).json({ status: "verification_failed", message: "Signature validation failed" });
    }
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Error verifying payment" });
  }
};

// Refund Payment
async function refundPayment(paymentId, amount) {
  try {
    const response = await axios.post(
      'https://api.razorpay.com/v1/refunds',
      { payment_id: paymentId, amount: amount * 100 }, // Amount in paise
      {
        auth: {
          username: process.env.RAZORPAY_KEY_ID,
          password: process.env.RAZORPAY_KEY_SECRET,
        },
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const refundQueryText = `INSERT INTO refund (refund_id, amount, currency, payment_id, status, created_at) 
                             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
    const refundValues = [
      response.data.id,
      response.data.amount / 100, // Converting back to normal currency
      response.data.currency,
      response.data.payment_id,
      response.data.status,
      new Date(response.data.created_at * 1000), // Converting timestamp to Date object
    ];
    await pool.query(refundQueryText, refundValues);

    return response.data;
  } catch (error) {
    console.error('Error initiating refund:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// Payment Refund Endpoint
exports.paymentRefund = async (req, res) => {
  const { paymentId, amount } = req.body;
  try {
    const refund = await refundPayment(paymentId, amount);
    return res.status(200).json({ message: 'Refund initiated successfully', refund });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to initiate refund', error: error.message });
  }
};

// Fetch All Orders Details
exports.getAllOrders = async (req, res) => {
  try {
    const queryText = 'SELECT * FROM orders ORDER BY id DESC';
    const dbRes = await pool.query(queryText);

    return res.status(200).json({ success: true, data: dbRes.rows });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
};

// Fetch All User Data - New Endpoint
exports.getAllUserData = async (req, res) => {
  try {
    const queryText = 'SELECT * FROM rzp_payments ORDER BY id DESC';
    const dbRes = await pool.query(queryText);

    return res.status(200).json({ success: true, data: dbRes.rows });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch user data' });
  }
};

// Webhook Endpoint for Razorpay - New Endpoint
exports.webhook = async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  const webhookSignature = req.headers["x-razorpay-signature"];
  const payload = JSON.stringify(req.body);

  try {
    // Validate webhook signature
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    if (generatedSignature !== webhookSignature) {
      return res.status(400).json({ status: "error", message: "Invalid webhook signature" });
    }

    // Handle different event types
    const { event, payload: eventData } = req.body;

    if (event === "payment.captured") {
      const payment = eventData.payment.entity;

      // Save payment captured event details to the database
      const queryText = `INSERT INTO rzp_payments (payment_id, order_id, amount, currency, status) 
                         VALUES ($1, $2, $3, $4, $5) RETURNING *`;
      const values = [payment.id, payment.order_id, payment.amount / 100, payment.currency, payment.status];
      
      await pool.query(queryText, values);
                                                                                      
      return res.status(200).json({ status: "success", message: "Webhook processed" });
    }

    return res.status(200).json({ status: "ignored", message: "Unhandled event type" });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ status: "error", message: "Webhook processing failed", error: error.message });
  }
};
