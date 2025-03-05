require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const admin = require("./config/firebase");
// const { Sequelize } = require("sequelize");
const authRoutes = require("./routes/authRoutes");

const app = express();

// Enable CORS for cross-domain authentication
const allowedOrigins = ["http://localhost:3000","http://localhost:4000"];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    exposedHeaders: ["set-cookie"], // Expose the 'set-cookie' header to the frontend
  })
);

// Middleware to parse JSON
app.use(express.json());
app.use(cookieParser()); // ✅ Enable cookie parsing

// Test Route to Verify Firebase Authentication
app.get("/api/health", (req, res) => {
  res.json({ status: "Auth API is running 🚀" });
});


app.use("/api/auth", authRoutes);

// Server Listening on Port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`✅ Auth API running on http://localhost:${PORT}`)
);
