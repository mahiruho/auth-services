const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const {
  signup,
  login,
  getMe,
  verifyToken,
  logout,
  testFirebase,
  testEmail,
  sendEmailVerificationLink,
  refreshToken,
  logoutAll, // New controller for logging out from all devices
} = require("../controllers/authController");

const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Allow 5 signups per IP per window
  message: "Too many signup attempts. Please try again later.",
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Allow 5 login attempts per IP per window
  message: "Too many failed login attempts. Please try again later.",
});
// Define Routes
router.post("/signup", signupLimiter, signup);
router.post("/login", loginLimiter, login);
router.get("/me", getMe);
router.post("/verify", verifyToken);
router.post("/logout", logout);
router.post("/logout-all", logoutAll); // New route for logging out from all devices
router.get("/test-firebase", testFirebase);
router.post("/test-email", testEmail);
router.post("/verify-email", sendEmailVerificationLink);
router.post("/refresh-token", refreshToken); // New route
module.exports = router;
