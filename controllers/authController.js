const { User } = require("../models");
const admin = require("../config/firebase");
const logger = require("../config/logger");
const { sendEmail } = require("../utils/emailService");
const { sendEmailVerification } = require("../services/firebaseService");
const validatePassword = (password) => {
  const regex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return regex.test(password);
};

exports.testFirebase = async (req, res) => {
  try {
    const user = await admin.auth().getUserByEmail("sanvi@gk.com");
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.testEmail = async (req, res) => {
  const { email } = req.body;
  const emailSent = await sendEmail(
    email,
    "Test Email - ThinkMirAI",
    "<p>This is a test email from ThinkMirAI.</p>"
  );
  res.json({ emailSent });
};

exports.sendEmailVerificationLink = async (req, res) => {
  const { email } = req.body;
  const emailSent = await sendEmailVerification(email);
  if (!emailSent.success) {
    return res.status(500).json({ error: emailSent.message });
  }
  res.json(emailSent);
};

exports.signup = async (req, res) => {
  const { email, password, fullName, phoneNumber } = req.body;

  try {
    // Validate Password
    if (!validatePassword(password)) {
      return res.status(400).json({
        error:
          "Password must be at least 8 characters long, contain an uppercase letter, a number, and a special character.",
      });
    }

    // Check if email already exists in Firebase
    try {
      const existingUser = await admin.auth().getUserByEmail(email);
      if (existingUser) {
        return res
          .status(400)
          .json({ error: "Email is already registered. Please log in." });
      }
    } catch (error) {
      if (error.code !== "auth/user-not-found") {
        logger.error(`Firebase Email Check Error: ${error.message}`);
        return res.status(500).json({ error: "Internal Server Error" });
      }
    }

    // Create User in Firebase
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: fullName,
      phoneNumber, // Firebase will validate this
    });

    // Generate Email Verification Link
    const emailSent = await sendEmailVerification(email);

    if (!emailSent.success) {
      return res
        .status(500)
        .json({
          error:
            "User created, but email verification failed. Please try again.",
        });
    }

    // Store User Metadata in PostgreSQL
    const newUser = await User.create({
      firebase_uid: userRecord.uid,
      email,
      full_name: fullName,
      phone_number: phoneNumber,
      email_verified: false, // Initially false until verified
      signup_date: new Date(),
    });

    res.status(201).json({
      message: "User registered successfully. Please verify your email.",
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        fullName: userRecord.displayName,
        phoneNumber: userRecord.phoneNumber,
      },
    });
  } catch (error) {
    // Handle Firebase Errors
    if (error.code === "auth/email-already-exists") {
      return res
        .status(400)
        .json({ error: "Email is already in use. Please log in." });
    } else if (error.code === "auth/invalid-phone-number") {
      return res.status(400).json({ error: "Invalid phone number format." });
    }
    else if (error.code === "auth/phone-number-already-exists") {
      return res.status(400).json({ error: "Phone number already exists." });
      }
    else if (error.code === "auth/weak-password") {
      return res.status(400).json({ error: "Password is too weak." });
    } else {
      logger.error(`Signup Error: ${error.message}`);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
};

// User Login
exports.login = async (req, res) => {
  res.json({ message: "Login endpoint not implemented yet" });
};

// Get Authenticated User Details
exports.getMe = async (req, res) => {

  const user = await User.findAll();
  res.json({ message: "GetMe endpoint not implemented yet",user });
};

// Verify Token
exports.verifyToken = async (req, res) => {
  res.json({ message: "Verify Token endpoint not implemented yet" });
};

// Logout User
exports.logout = async (req, res) => {
  res.json({ message: "Logout endpoint not implemented yet" });
};
