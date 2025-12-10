// routes/songs.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const db = require("../db");
const multer = require("multer");

const router = express.Router();

// Require login for certain routes
function requireLogin(req, res, next) {
  if (!req.user) {
    return res.redirect("/login");
  }
  next();
}

// Configure multer for audio uploads
const upload = multer({
  dest: path.join(__dirname, "..", "public", "uploads"),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("audio/")) {
      cb(null, true);
    } else {
      cb(new Error("Only audio files are allowed."));
    }
  },
});

/**
 * GET /songs
 * List songs, optionally filtered by city.
 * Also loads user's playlists (if logged in) so we can add songs to playlists.
 */
router.get("/", async (req, res, next) => {
  try {
    const rawCity = req.query.city || "";
    const city = rawCity.trim();

    let query = `
      SELECT s.*,
             COALESCE(ROUND(AVG(r.rating), 1), 0) AS avg_rating
      FROM songs s
      LEFT JOIN ratings r ON s.id = r.song_id
    `;
    const params = [];

    if (city) {
      // match anywhere in the city string
      query += " WHERE s.city LIKE ? ";
      params.push("%" + city + "%");
    }

    query += " GROUP BY s.id ORDER BY s.created_at DESC";

    const [songsRows] = await db.query(query, params);

    // If logged in, load their playlists
    let playlists = [];
    if (req.user) {
      const [plistRows] = await db.query(
        "SELECT * FROM playlists WHERE user_id = ? ORDER BY id DESC",
        [req.user.id]
      );
      playlists = plistRows;
    }

    res.render("songs/index", {
      user: req.user,
      songs: songsRows,
      selectedCity: rawCity,
      playlists,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /songs/new
 * Show upload form (requires login).
 */
router.get("/new", requireLogin, (req, res) => {
  res.render("songs/new", { user: req.user });
});

/**
 * POST /songs
 * Upload a new song (audio file + title + city).
 */
router.post(
  "/",
  requireLogin,
  upload.single("audio"),
  async (req, res, next) => {
    const { title, city } = req.body;

    if (!req.file) {
      return res.redirect("/songs/new");
    }

    // Public URL path for the file
    const file_path = "/uploads/" + req.file.filename;

    try {
      await db.query(
        `INSERT INTO songs (title, city, file_path, user_id)
         VALUES (?, ?, ?, ?)`,
        [title, city, file_path, req.user.id]
      );
      res.redirect("/songs");
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /songs/:id/edit
 * Edit song title/city.
 */
router.get("/:id/edit", requireLogin, async (req, res, next) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM songs WHERE id = ?",
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).send("Song not found");
    }

    res.render("songs/edit", {
      user: req.user,
      song: rows[0],
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /songs/:id/edit
 */
router.post("/:id/edit", requireLogin, async (req, res, next) => {
  const { title, city } = req.body;

  try {
    await db.query(
      `UPDATE songs
       SET title = ?, city = ?
       WHERE id = ?`,
      [title, city, req.params.id]
    );
    res.redirect("/songs");
  } catch (err) {
    next(err);
  }
});

/**
 * POST /songs/:id/delete
 */
router.post("/:id/delete", requireLogin, async (req, res, next) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM songs WHERE id = ?",
      [req.params.id]
    );

    if (rows.length > 0) {
      const song = rows[0];
      if (song.file_path) {
        const filePath = path.join(__dirname, "..", "public", song.file_path);
        if (fs.existsSync(filePath)) {
          fs.unlink(filePath, () => {});
        }
      }
    }

    await db.query("DELETE FROM songs WHERE id = ?", [req.params.id]);
    res.redirect("/songs");
  } catch (err) {
    next(err);
  }
});

/**
 * POST /songs/:id/rate
 */
router.post("/:id/rate", requireLogin, async (req, res, next) => {
  const rating = parseInt(req.body.rating, 10);

  if (isNaN(rating) || rating < 1 || rating > 5) {
    return res.redirect("/songs");
  }

  try {
    const [existing] = await db.query(
      "SELECT * FROM ratings WHERE user_id = ? AND song_id = ?",
      [req.user.id, req.params.id]
    );

    if (existing.length === 0) {
      await db.query(
        "INSERT INTO ratings (user_id, song_id, rating) VALUES (?, ?, ?)",
        [req.user.id, req.params.id, rating]
      );
    } else {
      await db.query(
        "UPDATE ratings SET rating = ? WHERE user_id = ? AND song_id = ?",
        [rating, req.user.id, req.params.id]
      );
    }

    res.redirect("/songs");
  } catch (err) {
    next(err);
  }
});

/**
 * GET /songs/:id
 * Details page for a single song.
 */
router.get("/:id", async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT s.*,
              COALESCE(ROUND(AVG(r.rating), 1), 0) AS avg_rating
       FROM songs s
       LEFT JOIN ratings r ON s.id = r.song_id
       WHERE s.id = ?
       GROUP BY s.id`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).send("Song not found");
    }

    res.render("songs/show", {
      user: req.user,
      song: rows[0],
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
