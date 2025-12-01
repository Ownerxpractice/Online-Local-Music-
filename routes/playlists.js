// routes/playlists.js
const express = require("express");
const db = require("../db");

const router = express.Router();

/**
 * GET /playlists
 * Show all playlists for current user.
 */
router.get("/", async (req, res, next) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM playlists WHERE user_id = ? ORDER BY id DESC",
      [req.user.id]
    );

    res.render("playlists/index", {
      user: req.user,
      playlists: rows,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /playlists
 * Create a playlist.
 */
router.post("/", async (req, res, next) => {
  const { name } = req.body;

  try {
    await db.query(
      "INSERT INTO playlists (name, user_id) VALUES (?, ?)",
      [name, req.user.id]
    );
    res.redirect("/playlists");
  } catch (err) {
    next(err);
  }
});

/**
 * POST /playlists/:id/delete
 */
router.post("/:id/delete", async (req, res, next) => {
  try {
    await db.query(
      "DELETE FROM playlists WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );
    res.redirect("/playlists");
  } catch (err) {
    next(err);
  }
});

/**
 * GET /playlists/:id
 * Show playlist with songs.
 */
router.get("/:id", async (req, res, next) => {
  try {
    const [plistRows] = await db.query(
      "SELECT * FROM playlists WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );

    if (plistRows.length === 0) {
      return res.status(404).send("Playlist not found");
    }

    const playlist = plistRows[0];

    const [songsRows] = await db.query(
      `SELECT s.*,
              COALESCE(ROUND(AVG(r.rating), 1), 0) AS avg_rating
       FROM playlist_songs ps
       JOIN songs s ON ps.song_id = s.id
       LEFT JOIN ratings r ON r.song_id = s.id
       WHERE ps.playlist_id = ?
       GROUP BY s.id
       ORDER BY s.created_at DESC`,
      [req.params.id]
    );

    res.render("playlists/show", {
      user: req.user,
      playlist,
      songs: songsRows,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /playlists/:id/add-song
 */
router.post("/:id/add-song", async (req, res, next) => {
  const { song_id } = req.body;

  try {
    // PK (playlist_id, song_id) so duplicates are automatically blocked
    await db.query(
      "INSERT IGNORE INTO playlist_songs (playlist_id, song_id) VALUES (?, ?)",
      [req.params.id, song_id]
    );
    res.redirect("/playlists/" + req.params.id);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /playlists/:id/remove-song
 */
router.post("/:id/remove-song", async (req, res, next) => {
  const { song_id } = req.body;

  try {
    await db.query(
      "DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?",
      [req.params.id, song_id]
    );
    res.redirect("/playlists/" + req.params.id);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
