const express = require("express");
const path = require("path");

const app = express();

// middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public")); 

// set view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// routes
const pagesRoute = require("./routes/pages");
app.use("/", pagesRoute);

// health check
app.get("/test", (req, res) => {
  res.send("Server is running ✔️");
});

// start server
const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
