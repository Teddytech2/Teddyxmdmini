const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();

// ✅ Port (Heroku Compatible)
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ✅ Serve static files - THIS IS THE FIX
app.use(express.static(path.join(__dirname)));

// ✅ DISPLAY pair.html on the main link (/)
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "pair.html")); // now it will find it
});

// Router Load
const pairRouter = require("./inconnu");
app.use("/", pairRouter);

// ✅ Health Check Route
app.get("/ping", (req, res) => {
    res.status(200).json({ status: "ok", message: "Server running" });
});

// Server Start
app.listen(PORT, () => {
    console.log("🚀 Server running on port", PORT);
});

module.exports = app;
