const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
// Import Authentication Controllers (to be created)
const {
  signup,
  login,
  getMe,
  verifyToken,
  logout,
  testFirebase,
} = require("../controllers/authController");

const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Allow 5 signups per IP per window
  message: "Too many signup attempts. Please try again later.",
});
// Define Routes
router.post("/signup", signupLimiter, signup);
router.post("/login", login);
router.get("/me", getMe);
router.post("/verify", verifyToken);
router.post("/logout", logout);
router.get("/test-firebase", testFirebase);

module.exports = router;
