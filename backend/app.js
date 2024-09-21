const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  allowedHeaders: 'Content-Type,Authorization'
};

app.use(cors(corsOptions));

// Middleware
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
const route = require("./routes/routes");
app.use("/api", route);

// Simple test route
app.get("/api", (req, res) => {
  res.status(200).json({ status: "Ok" });
});

// Error handler middleware
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
};

app.use(errorHandler);

module.exports = app;