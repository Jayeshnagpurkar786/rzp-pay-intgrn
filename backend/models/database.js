const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Create a new pool instance
const pool = new Pool({
  user: process.env.DATABASE_USER,
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE_NAME,
  password: process.env.DATABASE_PASSWORD,
  port: process.env.DATABASE_PORT,
  ssl: {
    rejectUnauthorized: false // Set to true if you want to enforce SSL validation
  }
});

console.log('Database connection details:', {
  user: process.env.DATABASE_USER,
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE_NAME,
  password: process.env.DATABASE_PASSWORD,
  port: process.env.DATABASE_PORT,
});

// Connect to the database
pool.connect()
  .then(() => console.log('Connected to the database'))
  .catch((err) => {
    console.error('Connection error', err.stack);
    process.exit(1); // Exit the process with an error code
  });

  //test query
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('Error executing test query:', err);
    } else {
      console.log('Test query result:', res.rows);
    }
  });
  

// Export the pool directly
module.exports = {pool}; // Export only the pool
