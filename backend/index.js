const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const paymentMethod = require('./controllers/paymentMethod');
const { getUserData, paymentMethodHandler } = require('./controllers/extraController');

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Basic route for testing
app.get('/', (req, res) => {
  res.send('Razorpay Payment Integration API is running');
});

// Routes from your routes.js file
app.post('/webhook', paymentMethodHandler);
app.get('/getAllUserData', getUserData);

app.post('/create-order', paymentMethod.createPayment);
app.post('/verify-payment', paymentMethod.verifyPayment);
app.post('/refund', paymentMethod.paymentRefund);
app.get('/getAllOrders', paymentMethod.getAllOrders);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

module.exports = app; // Export for testing purposes