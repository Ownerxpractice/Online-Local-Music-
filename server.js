const express = require("express");
const path = require("path");

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public")); // serves CSS, images, assets

// Set view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Routes
const pagesRoute = require("./routes/pages");
app.use("/", pagesRoute);

// Health check
app.get("/test", (req, res) => {
  res.send("Server is running ✔️");
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
