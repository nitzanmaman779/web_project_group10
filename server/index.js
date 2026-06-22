const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const port = 3000;

// נתיבים קבועים לתיקיות
const publicPath = path.join(__dirname, "../public");
const htmlPath = path.join(publicPath, "html");

// מאפשר לשרת לקרוא נתונים מטפסים ו-JSON
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// מאפשר לשרת להשתמש בקבצים מתוך תיקיית public
// למשל: css, js, images
app.use(express.static(publicPath));

// עמוד הבית
app.get("/", (req, res) => {
  res.sendFile(path.join(htmlPath, "index.html"));
});

// עמוד התחברות / הרשמה
app.get("/login", (req, res) => {
  res.sendFile(path.join(htmlPath, "login.html"));
});

// עמוד Arena
app.get("/arena", (req, res) => {
  res.sendFile(path.join(htmlPath, "arena.html"));
});

// עמוד My Cellar
app.get("/cellar", (req, res) => {
  res.sendFile(path.join(htmlPath, "cellar.html"));
});

// עמוד עריכת פרופיל
app.get("/edit-profile", (req, res) => {
  res.sendFile(path.join(htmlPath, "edit-profile.html"));
});

// אם כתובת לא קיימת
app.use((req, res) => {
  res.status(404).send("Page not found");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});