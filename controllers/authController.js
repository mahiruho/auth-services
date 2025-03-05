const { User } = require("../models");
const admin = require("../config/firebase");
const logger = require("../config/logger");
const { sendEmail } = require("../services/emailService");
const { sendEmailVerification } = require("../services/firebaseService");
const { generateJWT, generateRefreshToken, verifyJWT, verifyRefreshToken } = require("../services/jwtService");
const {
  JWT_COOKIE_NAME,
  JWT_REFRESH_COOKIE_NAME,
  COOKIE_HTTP_ONLY,
  COOKIE_SECURE,
  COOKIE_SAME_SITE,
  COOKIE_PATH,
  COOKIE_DOMAIN,
  JWT_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN,
} = process.env;

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
  try {
    const { firebaseToken } = req.body;
    if (!firebaseToken) {
      return res.status(400).json({ error: "Firebase token is required" });
    }

    // Verify Firebase Token
    const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
    const { uid, email, name, picture,email_verified } = decodedToken;

    // Check if user exists in DB (Optional, modify as needed)
    let user = await User.findOne({ where: { firebase_uid: uid } });
    if (!user) {
      // Create user in DB if not exists (Optional)
      user = await User.create({
        firebase_uid: uid,
        email,
        full_name: name || null,
        profile_pic: picture || null,
        signup_date: new Date(),
        last_login: new Date(),
        email_verified: email_verified,
      });
    }

    // Generate Tokens
    const miraiAuthToken = generateJWT(uid, email);
    const miraiRefreshToken = generateRefreshToken(uid, email);
    
    // Set HttpOnly Cookies for Secure Authentication
    res.cookie(JWT_COOKIE_NAME, miraiAuthToken, {
      httpOnly: COOKIE_HTTP_ONLY === "true", // Convert string to boolean
      secure: COOKIE_SECURE === 'true', // Ensure HTTPS usage
      sameSite: COOKIE_SAME_SITE, // Prevent CSRF attacks
      maxAge: JWT_EXPIRES_IN * 1000, // Convert seconds to milliseconds
    });

    res.cookie(JWT_REFRESH_COOKIE_NAME, miraiRefreshToken, {
      httpOnly: COOKIE_HTTP_ONLY === "true",
      secure: COOKIE_SECURE === 'true',
      sameSite: COOKIE_SAME_SITE,
      maxAge: JWT_REFRESH_EXPIRES_IN * 1000, // Convert seconds to milliseconds
    });

    // Return JWT Token in Response
    return res.json({
      message: "Login successful",
      miraiAuthToken, // Short-lived JWT
      user: {
        firebase_uid: user.firebase_uid,
        email: user.email,
        full_name: user.full_name,
        profile_pic: user.profile_pic,
        email_verified: user.email_verified,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(401).json({ error: "Invalid Firebase token" });
  }
};

exports.getMe = async (req, res) => {
  try {
    // Extract JWT from HttpOnly cookie
    const token = req.cookies[JWT_COOKIE_NAME];
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      // Verify JWT
      const decoded = verifyJWT(token);

      // Fetch user details from DB
      const user = await User.findOne({ where: { firebase_uid: decoded.uid } });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Return user details
      return res.json({
        firebase_uid: user.firebase_uid,
        email: user.email,
        full_name: user.full_name,
        profile_pic: user.profile_pic,
        email_verified: user.email_verified,
      });
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(403).json({ error: "TOKEN_EXPIRED" }); // 403 Forbidden (Token needs refresh)
      }
      return res.status(401).json({ error: "Invalid token" }); // 401 Unauthorized (Tampered token)
    }
  } catch (error) {
    console.error("Me Endpoint Error:", error);
    return res.status(500).json({ error: "Internal server error" }); // 500 for unexpected issues
  }
};

exports.refreshToken = async (req, res) => {
  try {
    // Extract Refresh Token from HttpOnly cookie
    const refreshToken = req.cookies[JWT_REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      return res.status(401).json({ error: "Refresh token missing" });
    }

    try {
      // Verify Refresh Token
      const decoded = verifyRefreshToken(refreshToken);

      // Generate a new JWT
      const newMiraiAuthToken = generateJWT(decoded.uid, decoded.email);

      // Set the new JWT in HttpOnly cookie
      res.cookie(JWT_COOKIE_NAME, newMiraiAuthToken, {
        httpOnly: COOKIE_HTTP_ONLY === "true",
        secure: COOKIE_SECURE === "true", // HTTPS only
        sameSite: COOKIE_SAME_SITE, // Prevent CSRF attacks
        maxAge: JWT_EXPIRES_IN * 1000, // 15 minutes
      });

      return res.json({ message: "Token refreshed successfully" });
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(403).json({ error: "REFRESH_TOKEN_EXPIRED" });
      }
      return res.status(401).json({ error: "Invalid refresh token" });
    }
  } catch (error) {
    console.error("Refresh Token Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};



// Verify Token
exports.verifyToken = async (req, res) => {
  try {
    // Extract JWT token from request body (sent by other ThinkMirAI apps)
    const token = req.body.token;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    try {
      // Verify JWT
      const decoded = verifyJWT(token);

      // Fetch the PostgreSQL User ID using Firebase UID
      const user = await User.findOne({ where: { firebase_uid: decoded.uid } });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Return PostgreSQL User ID along with Firebase UID
      return res.json({
        valid: true,
        userId: user.id, // PostgreSQL User ID
        firebaseUid: user.firebase_uid,
        email: user.email,
      });
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(403).json({ error: "TOKEN_EXPIRED" });
      }
      return res.status(401).json({ error: "Invalid token" });
    }
  } catch (error) {
    console.error("Verify Token Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};


// Logout User
exports.logout = async (req, res) => {
  try {
    // Clear both tokens by setting empty cookies with immediate expiration
    res.cookie(JWT_COOKIE_NAME, "", {
      httpOnly: COOKIE_HTTP_ONLY,
      secure: COOKIE_SECURE,
      sameSite: COOKIE_SAME_SITE,
      expires: new Date(0), // Expire immediately
    });

    res.cookie(JWT_REFRESH_COOKIE_NAME, "", {
      httpOnly: COOKIE_HTTP_ONLY,
      secure: COOKIE_SECURE,
      sameSite: COOKIE_SAME_SITE,
      expires: new Date(0),
    });

    return res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

