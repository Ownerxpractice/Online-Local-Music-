const express = require("express");
const path = require("path");
const db = require("./db");

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public")); // styles.css, js, uploads

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// TEMP USER (based on email, because table uses name/email/password_hash)
app.use(async (req, res, next) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      ["demo@example.com"]
    );

    let user;
    if (rows.length === 0) {
      const [insertResult] = await db.query(
        "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
        ["Demo User", "demo@example.com", ""]
      );
      const newId = insertResult.insertId;
      user = { id: newId, name: "Demo User", email: "demo@example.com" };
    } else {
      user = rows[0];
    }

    req.user = { id: user.id, name: user.name, email: user.email };
    next();
  } catch (err) {
    console.error("Error in temp user middleware:", err);
    next(err);
  }
});

// Existing Phase-1 routes
const pagesRoute = require("./routes/pages");
app.use("/", pagesRoute);

// NEW Phase-2 routes
const songsRouter = require("./routes/songs");
const playlistsRouter = require("./routes/playlists");
app.use("/songs", songsRouter);
app.use("/playlists", playlistsRouter);

// Health check
app.get("/test", (req, res) => {
  res.send("Server is running ✔️");
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send("Internal server error");
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
