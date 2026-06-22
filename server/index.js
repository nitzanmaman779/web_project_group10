const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const port = 3000;

// מאפשר לשרת לקרוא נתונים מטפסים ו-JSON
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// מאפשר לשרת להשתמש בקבצים מתוך תיקיית public
app.use(express.static(path.join(__dirname, "../public")));

// עמוד הבית
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/html/index.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/html/login.html"));
});

app.get("/arena", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/html/arena.html"));
});

app.get("/cellar", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/html/cellar.html"));
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});