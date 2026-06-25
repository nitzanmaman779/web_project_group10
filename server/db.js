// Simple MySQL connection helper for the application.
// Uses the `mysql2` driver to create and export a single connection
// instance that other modules can require and use.

const mysql = require("mysql2");

// Create a connection to the local MySQL server. Update these
// credentials or move them to environment variables for production.
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "News777Swim!",
  database: "wineder_db"
});

// Open the connection and log success or failure. The callback
// reports connection errors which can be useful during development.
connection.connect((err) => {
  if (err) {
    console.log("Error connecting to MySQL:", err);
    return;
  }

  console.log("Connected to MySQL database");
});

// Export the connection so other modules can run queries like:
// `const db = require('../server/db'); db.query(...)`
module.exports = connection;

