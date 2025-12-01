// routes/songs.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const db = require("../db");

const router = express.Router();

/**
 * GET /songs
 * List all songs with average rating.
 */
router.get("/", async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT s.*,
              COALESCE(ROUND(AVG(r.rating), 1), 0) AS avg_rating
       FROM songs s
       LEFT JOIN ratings r ON s.id = r.song_id
       GROUP BY s.id
       ORDER BY s.created_at DESC`
    );

    res.render("songs/index", {
      user: req.user,
      songs: rows,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /songs/new
 * Show simple “upload” form (we just store file_path text).
 */
router.get("/new", (req, res) => {
  res.render("songs/new", { user: req.user });
});

/**
 * POST /songs
 * Insert a new song row.
 */
router.post("/", async (req, res, next) => {
  const { title, city, file_path } = req.body;

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
});

/**
 * GET /songs/:id/edit
 * Edit song title/city.
 */
router.get("/:id/edit", async (req, res, next) => {
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
router.post("/:id/edit", async (req, res, next) => {
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
router.post("/:id/delete", async (req, res, next) => {
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
 * Upsert rating (because your ratings table does NOT have a unique constraint
 * on (user_id, song_id), we’ll manual “upsert”).
 */
router.post("/:id/rate", async (req, res, next) => {
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
