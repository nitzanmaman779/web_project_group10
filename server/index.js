const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const db = require("./db");

const app = express();
const port = 3000;

// הגדרת הנתיבים לתיקיות הקבצים הסטטיים ועמודי ה-HTML
const publicPath = path.join(__dirname, "../public");
const htmlPath = path.join(publicPath, "html");

// הגדרות שמאפשרות לשרת לקרוא נתונים שמגיעים מהטפסים ומהבקשות בצד הלקוח
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(publicPath));

// הגדרות קבועות של הניקוד והדרגות 
const DAILY_GOAL = 5;
const SWIPE_POINTS = 2;
const DAILY_GOAL_BONUS = 50;
const CUSTOM_WINE_POINTS = 50;

// פונקציה שמחזירה את דרגת המשתמש לפי כמות הנקודות שלו
function calculateLevel(points) {
  if (points >= 500) return "Master of Wine";
  if (points >= 300) return "Vintage Expert";
  if (points >= 170) return "Wine Lover";
  if (points >= 100) return "Curious Taster";
  return "Casual Sipper";
}

// בדיקות כלליות שחוזרות בכמה נתיבים, כדי לא להכניס למסד הנתונים מידע לא תקין
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SIGNUP_WINE_COLORS = ["red", "white", "rose", "all"];
const SIGNUP_SWEETNESS_LEVELS = ["dry", "semi-dry", "sweet", "all"];
const CUSTOM_WINE_TYPES = ["Red", "White", "Rose"];
const PROFILE_PREFERENCES = ["Red", "White", "Rosé", "Dry", "Semi-Dry", "Sweet", "red", "white", "rose", "all", "dry", "semi-dry", "sweet"];

// פונקציות לשימוש ולידציות צד שרת 
// בדיקה שהאימייל הוא טקסט ובמבנה תקין
function isValidEmail(email) {
  return typeof email === "string" && EMAIL_REGEX.test(email.trim());
}

//  מבדיקה שערך מסוים הוא מספר שלם וחיובי משמש לבדיקת מזהה של יין
function isPositiveInteger(value) {
  const numberValue = Number(value);
  return Number.isInteger(numberValue) && numberValue > 0;
}

// בדיקה שכל הערכים שהתקבלו נמצאים ברשימת הערכים שמותר לקבל
// משמש לבחירת העדפות יין או סוגי יין
function hasOnlyAllowedValues(values, allowedValues) {
  return Array.isArray(values) && values.every(value => allowedValues.includes(value));
}

// בדיקה שבהרשמה המשתמש בחר גם העדפת צבע יין וגם העדפת מתיקות
function hasSignupColorAndSweetness(winePreferences) {
  if (!Array.isArray(winePreferences)) return false;

  const allCount = winePreferences.filter(value => value === "all").length;
  const hasSpecificColor = winePreferences.some(value => ["red", "white", "rose"].includes(value));
  const hasSpecificSweetness = winePreferences.some(value => ["dry", "semi-dry", "sweet"].includes(value));

  // בחירה של צבע מסוים או בחירה כללית נחשבת כהעדפת צבע
  const hasColorPreference = hasSpecificColor || allCount > 0;

  // בחירה של מתיקות מסוימת או שימוש בבחירה כללית נחשבים כהעדפת מתיקות
  const hasSweetnessPreference = hasSpecificSweetness || (hasSpecificColor && allCount > 0) || allCount > 1;

  return hasColorPreference && hasSweetnessPreference;
}

// בדיקה ששנת היין היא שנה הגיונית
// מאפשרים שנה מ-1800 ועד שנה אחת קדימה
function isValidWineYear(year) {
  const yearNumber = Number(year);
  const maxYear = new Date().getFullYear() + 1;
  return Number.isInteger(yearNumber) && yearNumber >= 1800 && yearNumber <= maxYear;
}


//  נתיבי עמודים 

// כל נתיב מחזיר עמוד HTML מתאים מתוך תיקיית public/html
app.get("/", (req, res) => res.sendFile(path.join(htmlPath, "index.html")));
app.get("/login", (req, res) => res.sendFile(path.join(htmlPath, "login.html")));
app.get("/arena", (req, res) => res.sendFile(path.join(htmlPath, "arena.html")));
app.get("/cellar", (req, res) => res.sendFile(path.join(htmlPath, "cellar.html")));
app.get("/edit-profile", (req, res) => res.sendFile(path.join(htmlPath, "edit-profile.html")));

// נתיבים שעובדים מול מסד הנתונים 
// יצירת משתמש חדש עם פרטים בסיסיים, העדפות יין ונתוני ניקוד התחלתיים
app.post("/signup", (req, res) => {
  const { firstName, lastName, email, password, winePreferences } = req.body;
  const cleanFirstName = typeof firstName === "string" ? firstName.trim() : "";
  const cleanLastName = typeof lastName === "string" ? lastName.trim() : "";
  const cleanEmail = typeof email === "string" ? email.trim() : "";

  // ולידציה בצד השרת: לא יוצרים משתמש אם חסרים שדות בסיסיים
  if (!cleanFirstName || !cleanLastName || !cleanEmail || !password) {
    return res.status(400).json({ message: "Please fill all required fields." });
  }

  // ולידציה בצד השרת: בדיקת מבנה אימייל וסיסמה לפני שמירה במסד הנתונים
  if (!isValidEmail(cleanEmail)) {
    return res.status(400).json({ message: "Please enter a valid email address." });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters." });
  }

  // ולידציה בצד השרת: בהרשמה חייבים לבחור לפחות צבע יין אחד ולפחות רמת מתיקות אחת
  if (!Array.isArray(winePreferences) || winePreferences.length === 0) {
    return res.status(400).json({ message: "Please choose wine preferences." });
  }

  if (!hasOnlyAllowedValues(winePreferences, [...SIGNUP_WINE_COLORS, ...SIGNUP_SWEETNESS_LEVELS])) {
    return res.status(400).json({ message: "Invalid wine preferences." });
  }

  if (!hasSignupColorAndSweetness(winePreferences)) {
    return res.status(400).json({ message: "Please choose at least one wine color and one sweetness level." });
  }

    // אם המשתמש בחר כמה העדפות יין, שומרים אותן כמחרוזת אחת במסד הנתונים
  const preferencesText = winePreferences.join(",");
  const sql = `INSERT INTO users (email, password, firstName, lastName, wine_preferences, points, level, streak, daily_swipes_count, last_active_date) VALUES (?, ?, ?, ?, ?, 0, 'Casual Sipper', 0, 0, NULL)`;

  db.query(sql, [cleanEmail, password, cleanFirstName, cleanLastName, preferencesText], (err, result) => {
    if (err) return res.status(500).json({ message: err.code === "ER_DUP_ENTRY" ? "Email already exists." : "Error creating user." });
    // החזרת פרטי המשתמש לצד הלקוח כדי לשמור אותם בדפדפן לאחר הרשמה
    res.json({ message: "User created successfully", user: { id: result.insertId, firstName: cleanFirstName, lastName: cleanLastName, email: cleanEmail, winePreferences: preferencesText, points: 0, level: "Casual Sipper", streak: 0, dailySwipesCount: 0 } });
  });
});


// התחברות משתמש קיים לפי אימייל וסיסמה
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const cleanEmail = typeof email === "string" ? email.trim() : "";

  // ולידציה בצד השרת: התחברות לא נבדקת מול מסד הנתונים אם חסרים אימייל או סיסמה
  if (!cleanEmail || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  if (!isValidEmail(cleanEmail)) {
    return res.status(400).json({ message: "Please enter a valid email address." });
  }

  db.query(`SELECT * FROM users WHERE email = ? AND password = ?`, [cleanEmail, password], (err, results) => {
    if (err || results.length === 0) return res.status(401).json({ message: "Invalid email or password." });
    const user = results[0];
    res.json({ message: "Login successful", user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, winePreferences: user.wine_preferences || "", points: user.points, level: user.level, streak: user.streak, dailySwipesCount: user.daily_swipes_count, lastActiveDate: user.last_active_date } });
  });
});

// שליפת כל היינות הקיימים במערכת
app.get("/wines", (req, res) => {
  db.query("SELECT * FROM wines", (err, results) => {
    if (err) return res.status(500).json({ message: "Error getting wines." });
    res.json(results);
  });
});

// שליפת יינות לארנה, בלי יינות שכבר נמצאים במרתף של המשתמש
app.get("/arena-wines", (req, res) => {
  const userEmail = req.query.email;
  
  if (!userEmail) {
    return res.status(400).json({ message: "Email is required" });
  }

  // ולידציה בצד השרת: בודקים שהאימייל שהגיע בבקשה נראה כמו אימייל תקין
  if (!isValidEmail(userEmail)) {
    return res.status(400).json({ message: "Invalid email address." });
  }

  const sql = `
    SELECT * FROM wines 
    WHERE id NOT IN (
      SELECT wine_id FROM user_cellar WHERE user_email = ?
    )
  `;

  db.query(sql, [userEmail], (err, results) => {
    if (err) {
      console.log("Error fetching arena wines:", err);
      res.status(500).json({ message: "Error fetching wines" });
      return;
    }
    res.json(results);
  });
});

// שליפת כל היינות במרתף של משתמש מסוים: יינות רגילים ויינות אישיים
app.get("/cellar/:email", (req, res) => {
  const userEmail = req.params.email;

  // ולידציה בצד השרת: לא שולפים מרתף אם האימייל בנתיב לא תקין
  if (!isValidEmail(userEmail)) {
    return res.status(400).json({ message: "Invalid email address." });
  }

  // UNION ALL מחבר בין יינות מטבלת wines לבין יינות שהמשתמש הוסיף בעצמו
  const sql = `
    SELECT wines.id AS id, wines.name, wines.winery, wines.type, wines.year, wines.image, 'regular' AS source
    FROM user_cellar JOIN wines ON user_cellar.wine_id = wines.id WHERE user_cellar.user_email = ?
    UNION ALL
    SELECT custom_wines.id AS id, custom_wines.name, custom_wines.winery, custom_wines.type, custom_wines.year, custom_wines.image, 'custom' AS source
    FROM custom_wines WHERE custom_wines.user_email = ?
  `;
  db.query(sql, [userEmail, userEmail], (err, results) => {
    if (err) return res.status(500).json({ message: "Error getting cellar." });
    res.json(results);
  });
});

// הוספת יין רגיל למרתף של המשתמש
app.post("/cellar", (req, res) => {
  const { userEmail, wineId } = req.body;

  // ולידציה בצד השרת: הוספה למרתף דורשת משתמש תקין ומזהה יין תקין
  if (!isValidEmail(userEmail)) {
    return res.status(400).json({ message: "Invalid user email." });
  }

  if (!isPositiveInteger(wineId)) {
    return res.status(400).json({ message: "Invalid wine id." });
  }

  db.query(`INSERT INTO user_cellar (user_email, wine_id) VALUES (?, ?)`, [userEmail, wineId], (err) => {
    if (err) return res.status(500).json({ message: "Error adding wine." });
    res.json({ message: "Wine added to cellar successfully." });
  });
});

// מחיקת יין אישי שהמשתמש הוסיף בעצמו
app.delete("/cellar", (req, res) => {
  const { userEmail, wineId } = req.body;

  // ולידציה בצד השרת: מחיקה מהמרתף מתבצעת רק עם אימייל ומזהה יין תקינים
  if (!isValidEmail(userEmail)) {
    return res.status(400).json({ message: "Invalid user email." });
  }

  if (!isPositiveInteger(wineId)) {
    return res.status(400).json({ message: "Invalid wine id." });
  }

  db.query(`DELETE FROM user_cellar WHERE user_email = ? AND wine_id = ?`, [userEmail, wineId], (err) => {
    if (err) return res.status(500).json({ message: "Error removing wine." });
    res.json({ message: "Wine removed." });
  });
});
// מחיקת יין אישי שהמשתמש הוסיף בעצמו
app.delete("/custom-wine", (req, res) => {
  const { userEmail, wineId } = req.body;

  // ולידציה בצד השרת: מחיקת יין אישי דורשת אימייל ומזהה יין תקינים
  if (!isValidEmail(userEmail)) {
    return res.status(400).json({ message: "Invalid user email." });
  }

  if (!isPositiveInteger(wineId)) {
    return res.status(400).json({ message: "Invalid wine id." });
  }

  db.query(`DELETE FROM custom_wines WHERE user_email = ? AND id = ?`, [userEmail, wineId], (err) => {
    if (err) return res.status(500).json({ message: "Error removing custom wine." });
    res.json({ message: "Custom wine removed." });
  });
});

// הוספת יין אישי למרתף ועדכון הניקוד של המשתמש
app.post("/custom-wine", (req, res) => {
  const { userEmail, name, winery, type, year, image } = req.body;
  const cleanName = typeof name === "string" ? name.trim() : "";
  const cleanWinery = typeof winery === "string" ? winery.trim() : "";

  // ולידציה בצד השרת: יין אישי חייב להגיע עם משתמש, שם יין, יקב, סוג ושנה תקינים
  if (!isValidEmail(userEmail)) {
    return res.status(400).json({ message: "Invalid user email." });
  }

  if (!cleanName || !cleanWinery) {
    return res.status(400).json({ message: "Wine name and winery are required." });
  }

  if (!CUSTOM_WINE_TYPES.includes(type)) {
    return res.status(400).json({ message: "Invalid wine type." });
  }

  if (!isValidWineYear(year)) {
    return res.status(400).json({ message: "Invalid wine year." });
  }

  const sql = `INSERT INTO custom_wines (user_email, name, winery, type, year, image) VALUES (?, ?, ?, ?, ?, ?)`;

  db.query(sql, [userEmail, cleanName, cleanWinery, type, Number(year), image || "../images/wine_images/default-wine.png"], (err, result) => {
    if (err) return res.status(500).json({ message: "Error adding custom wine." });

    // לאחר שמירת היין, שולפים את נתוני המשתמש כדי לעדכן נקודות ודרגה
    db.query(`SELECT points, level FROM users WHERE email = ?`, [userEmail], (selectErr, users) => {
      if (selectErr || users.length === 0) {
        return res.status(500).json({ message: "Wine was added, but gamification stats could not be loaded." });
      }

      // שומרים גם את הדרגה הישנה כדי לדעת אם צריך להציג הודעת עליית דרגה.
      const oldPoints = Number(users[0].points) || 0;
      const oldLevel = users[0].level || calculateLevel(oldPoints);
      const newPoints = oldPoints + CUSTOM_WINE_POINTS;
      const newLevel = calculateLevel(newPoints);

      db.query(
        `UPDATE users SET points = ?, level = ? WHERE email = ?`,
        [newPoints, newLevel, userEmail],
        (updateErr) => {
          if (updateErr) {
            return res.status(500).json({ message: "Wine was added, but points could not be updated." });
          }

          // החזרת היין החדש יחד עם נתוני הניקוד המעודכנים
          res.json({
            message: "Custom wine added.",
            wine: {
              id: result.insertId,
              name: cleanName,
              winery: cleanWinery,
              type,
              year: Number(year),
              image: image || "../images/wine_images/default-wine.png",
              source: "custom"
            },
            stats: {
              points: newPoints,
              level: newLevel,
              pointsDelta: CUSTOM_WINE_POINTS,
              levelUp: oldLevel !== newLevel,
              oldLevel
            }
          });
        }
      );
    });
  });
});

//  לוגיקת הניקוד המרכזית 

// עדכון נקודות לאחר החלקה בארנה
app.post("/swipe", (req, res) => {
  const { userEmail } = req.body;

  // ולידציה בצד השרת: אי אפשר לעדכן ניקוד בלי לדעת לאיזה משתמש שייך הסוויפ
  if (!isValidEmail(userEmail)) {
    return res.status(400).json({ message: "Invalid user email." });
  }

  db.query(
    `SELECT points, level, streak, daily_swipes_count, last_active_date FROM users WHERE email = ?`,
    [userEmail],
    (err, results) => {
      if (err || results.length === 0) {
        return res.status(500).json({ message: "Error fetching user data." });
      }

      // שליפת נתוני הגיימיפיקציה הנוכחיים של המשתמש
      let { points, level, streak, daily_swipes_count, last_active_date } = results[0];

      points = Number(points) || 0;
      streak = Number(streak) || 0;
      daily_swipes_count = Number(daily_swipes_count) || 0;

      const oldLevel = level || calculateLevel(points);
      const todayObj = new Date();
      const formattedToday = todayObj.toISOString().split("T")[0];

      // חישוב כמה ימים עברו מהפעילות האחרונה של המשתמש
      let diffDays = 0;
      if (last_active_date) {
        const lastDateObj = new Date(last_active_date);
        const utcToday = Date.UTC(todayObj.getFullYear(), todayObj.getMonth(), todayObj.getDate());
        const utcLast = Date.UTC(lastDateObj.getFullYear(), lastDateObj.getMonth(), lastDateObj.getDate());
        diffDays = Math.floor((utcToday - utcLast) / (1000 * 60 * 60 * 24));
      } else {
        diffDays = 999;
      }

      // אם עבר יום או יותר, בודקים האם צריך לאפס את הרצף ואת ספירת ההחלקות היומית
      if (diffDays >= 1) {
        if (diffDays > 1 || daily_swipes_count < DAILY_GOAL) {
          streak = 0;
        }
        daily_swipes_count = 0;
      }

      // הוספת נקודות בסיסיות עבור כל החלקה
      points += SWIPE_POINTS;
      daily_swipes_count += 1;

      let bonusPoints = 0;
      let dailyGoalCompleted = false;

      // כאשר המשתמש מגיע ליעד היומי, מתווסף בונוס ומתעדכן הרצף
      if (daily_swipes_count === DAILY_GOAL) {
        dailyGoalCompleted = true;
        bonusPoints += DAILY_GOAL_BONUS;
        points += DAILY_GOAL_BONUS;
        streak += 1;

        // כל רצף של 7 ימים מזכה בבונוס שבועי
        if (streak > 0 && streak % 7 === 0) {
          const weeks = streak / 7;
          const weeklyBonus = 250 * weeks;
          bonusPoints += weeklyBonus;
          points += weeklyBonus;
        }
      }

      const newLevel = calculateLevel(points);

      db.query(
        `UPDATE users SET points = ?, level = ?, streak = ?, daily_swipes_count = ?, last_active_date = ? WHERE email = ?`,
        [points, newLevel, streak, daily_swipes_count, formattedToday, userEmail],
        (updateErr) => {
          if (updateErr) {
            return res.status(500).json({ message: "Error updating gamification stats." });
          }

          // החזרת נתוני הניקוד המעודכנים לצד הלקוח
          res.json({
            points,
            level: newLevel,
            streak,
            dailySwipesCount: daily_swipes_count,
            pointsDelta: SWIPE_POINTS,
            bonusPoints,
            dailyGoalCompleted,
            levelUp: oldLevel !== newLevel,
            oldLevel
          });
        }
      );
    }
  );
});

// שליפת פרטי המשתמש למסך עריכת הפרופיל
app.get("/profile/:email", (req, res) => {
  // ולידציה בצד השרת: לא שולפים פרופיל אם האימייל בנתיב לא תקין
  if (!isValidEmail(req.params.email)) {
    return res.status(400).json({ message: "Invalid email address." });
  }

  db.query(`SELECT * FROM users WHERE email = ?`, [req.params.email], (err, results) => {
    if (err || results.length === 0) return res.status(404).json({ message: "User not found." });
    res.json(results[0]);
  });
});

// שמירת שינויים בפרטי המשתמש ובהעדפות היין
app.put("/profile", (req, res) => {
  const { currentEmail, firstName, lastName, password, winePreferences } = req.body;
  const cleanFirstName = typeof firstName === "string" ? firstName.trim() : "";
  const cleanLastName = typeof lastName === "string" ? lastName.trim() : "";

  // ולידציה בצד השרת: עדכון פרופיל דורש משתמש קיים, שם פרטי וסיסמה
  if (!currentEmail || !cleanFirstName || !password) {
    return res.status(400).json({ message: "Missing required profile details." });
  }

  if (!isValidEmail(currentEmail)) {
    return res.status(400).json({ message: "Invalid email address." });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters." });
  }

  // ולידציה בצד השרת: אם נשלחו העדפות, בודקים שהן מתוך האפשרויות שקיימות באתר
  if (winePreferences && !hasOnlyAllowedValues(winePreferences, PROFILE_PREFERENCES)) {
    return res.status(400).json({ message: "Invalid wine preferences." });
  }

  const prefs = Array.isArray(winePreferences) ? winePreferences.join(",") : "";

  const sql = `
    UPDATE users
    SET firstName = ?, lastName = ?, password = ?, wine_preferences = ?
    WHERE email = ?
  `;

  db.query(
    sql,
    [cleanFirstName, cleanLastName || "", password, prefs, currentEmail],
    (err, result) => {
      if (err) {
        console.log("Profile update error:", err);
        return res.status(500).json({ message: "Error updating profile." });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "User not found." });
      }

      // החזרת הפרטים המעודכנים כדי לעדכן את המידע בצד הלקוח
      res.json({
        message: "Profile updated successfully.",
        user: {
          firstName: cleanFirstName,
          lastName: cleanLastName || "",
          email: currentEmail,
          winePreferences: prefs
        }
      });
    }
  );
});

// טיפול בכל נתיב שלא הוגדר במערכת
app.use((req, res) => res.status(404).send("Page not found"));

// הפעלת השרת על הפורט שהוגדר
app.listen(port, () => console.log(`Server is running on port ${port}`));
