// routes/pages.js
const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.render("home", { user: req.user });
});

router.get("/login", (req, res) => {
  res.render("login", { user: req.user });
});

router.get("/signup", (req, res) => {
  res.render("signup", { user: req.user });
});

// Optional mock upload page (you can keep or remove this)
// Real upload happens at /songs/new
router.get("/upload", (req, res) => {
  res.render("upload", { user: req.user });
});

module.exports = router;
