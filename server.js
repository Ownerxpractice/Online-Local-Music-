// server.js
const express = require("express");
const path = require("path");
const db = require("./db");
const session = require("express-session");
const bcrypt = require("bcryptjs");

const app = express();

// Parse form data
app.use(express.urlencoded({ extended: true }));

// Static files (CSS, JS, uploads, etc.)
app.use(express.static(path.join(__dirname, "public")));

// Session middleware for login state
app.use(
  session({
    secret: "super-secret-key-change-this", // change this string
    resave: false,
    saveUninitialized: false,
  })
);

// Load logged-in user from session (if any)
app.use(async (req, res, next) => {
  try {
    if (!req.session.userId) {
      req.user = null;
      return next();
    }

    const [rows] = await db.query(
      "SELECT id, name, email FROM users WHERE id = ?",
      [req.session.userId]
    );

    if (rows.length === 0) {
      req.user = null;
    } else {
      req.user = rows[0];
    }

    next();
  } catch (err) {
    console.error("Error loading user from session:", err);
    next(err);
  }
});

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Routes
const pagesRoute = require("./routes/pages");
const songsRouter = require("./routes/songs");
const playlistsRouter = require("./routes/playlists");

app.use("/", pagesRoute);
app.use("/songs", songsRouter);
app.use("/playlists", playlistsRouter);

// AUTH ROUTES
// SIGNUP (create new user)
app.post("/signup", async (req, res, next) => {
  const { name, email, password } = req.body;

  try {
    // If email already exists, just send them to login
    const [existing] = await db.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );
    if (existing.length > 0) {
      return res.redirect("/login");
    }

    const hash = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
      [name, email, hash]
    );

    // Log the new user in
    req.session.userId = result.insertId;
    res.redirect("/");
  } catch (err) {
    next(err);
  }
});

// LOGIN
app.post("/login", async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      // No user with that email
      return res.redirect("/login");
    }

    const user = rows[0];
    const matched = await bcrypt.compare(password, user.password_hash);

    if (!matched) {
      // Wrong password
      return res.redirect("/login");
    }

    // Success: store user id in session
    req.session.userId = user.id;
    res.redirect("/");
  } catch (err) {
    next(err);
  }
});

// LOGOUT
app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

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
