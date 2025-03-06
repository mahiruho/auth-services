const { User, LoginHistory,DeviceSession } = require("../models");
const { v4: uuidv4 } = require("uuid");
const admin = require("../config/firebase");
const logger = require("../config/logger");
const { sendEmail } = require("../services/emailService");
const { sendEmailVerification } = require("../services/firebaseService");
const { generateJWT, generateRefreshToken, verifyJWT, verifyRefreshToken } = require("../services/jwtService");
const { where } = require("sequelize");
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
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_DURATION,
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
    const { firebaseToken, email } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.headers["user-agent"] || "Unknown";
    if (!firebaseToken) {
      return res.status(400).json({ error: "Firebase token is required" });
    }
    // Check if user exists
    let user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check if account is locked
    if (user.locked_until && new Date() < user.locked_until) {
      return res
        .status(423)
        .json({
          error:
            "Account locked due to multiple failed login attempts. Try again later.",
        });
    }

    // Verify Firebase Token
    const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
    const { uid, name, picture, email_verified } = decodedToken;
    
    if (decodedToken.email !== email) {
      await trackFailedLogin(email, ipAddress, userAgent, "Email mismatch");
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (email_verified === false) {
      return res.status(412).json({ error: "Email not verified" });
    }

    await resetFailedLogins(email);
    
    // Check if email is verified
    
    const currentDateTime = new Date();
    if (user) {
      await User.update(
        { last_login: currentDateTime, email_verified: email_verified },
        { where: { firebase_uid: uid } }
      );
    }

    const session_id = uuidv4();
    await LoginHistory.create({
      user_id: user.id,
      login_time: currentDateTime,
      ip_address: ipAddress,
      device: userAgent,
      session_id,
    });

    await DeviceSession.create({
      user_id: user.id,
      device: userAgent,
      ip_address: ipAddress,
      login_time: currentDateTime,
      session_id,
    });

    // Generate Tokens
    const miraiAuthToken = generateJWT(uid, email,session_id);
    const miraiRefreshToken = generateRefreshToken(uid, email,session_id);

    // Set HttpOnly Cookies for Secure Authentication
    res.cookie(JWT_COOKIE_NAME, miraiAuthToken, {
      httpOnly: COOKIE_HTTP_ONLY === "true", // Convert string to boolean
      secure: COOKIE_SECURE === "true", // Ensure HTTPS usage
      sameSite: COOKIE_SAME_SITE, // Prevent CSRF attacks
      maxAge: JWT_EXPIRES_IN * 1000, // Convert seconds to milliseconds
    });

    res.cookie(JWT_REFRESH_COOKIE_NAME, miraiRefreshToken, {
      httpOnly: COOKIE_HTTP_ONLY === "true",
      secure: COOKIE_SECURE === "true",
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

async function trackFailedLogin(email, ipAddress, device, reason) {
  const existingAttempt = await FailedLogin.findOne({
    where: { email, ip_address: ipAddress },
  });

  if (existingAttempt) {
    existingAttempt.attempt_count += 1;
    await existingAttempt.save();
  } else {
    await FailedLogin.create({
      email,
      ip_address: ipAddress,
      device,
      reason,
      attempt_count: 1,
    });
  }

  const failedAttempts = await FailedLogin.count({ where: { email } });
  if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
    await User.update(
      { locked_until: new Date(Date.now() + LOCKOUT_DURATION) },
      { where: { email } }
    );
  }
}

async function resetFailedLogins(email) {
  await FailedLogin.destroy({ where: { email } });
}

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

      const deviceSession = await DeviceSession.findOne({
        where: {
          user_id: decoded.uid,
          session_id: decoded.session_id,
        },
      });
      if(deviceSession.is_active === false){
        return res.status(401).json({ error: "Session Expired" });  
      }

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
      const deviceSession = await DeviceSession.findOne({
        where: {
          user_id: decoded.uid,
          session_id: decoded.session_id,
        },
      });
      if (deviceSession.is_active === false) {
        return res.status(401).json({ error: "Session Expired" });
      }

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
    // Extract JWT token from request
    const token = req.cookies[JWT_COOKIE_NAME];
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    // Verify JWT token
    const decoded = verifyJWT(token);
    if (!decoded.uid || !decoded.session_id) {
      return res.status(401).json({ error: "Invalid token" });
    }
    // Mark only the current session as inactive
    await DeviceSession.update(
      { is_active: false },
      {
        where: {
          user_id: decoded.uid,
          session_id: decoded.session_id,
        },
      }
    );
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

exports.logoutAll = async (req, res) => {
  try {
    // Extract JWT token from request
    const token = req.cookies[JWT_COOKIE_NAME];
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Verify JWT token
    const decoded = verifyJWT(token);
    if (!decoded.uid) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Mark all device sessions as inactive
    await DeviceSession.update(
      { is_active: false },
      { where: { user_id: decoded.uid } }
    );

    // Clear authentication cookies
    res.cookie(JWT_COOKIE_NAME, "", {
      httpOnly: COOKIE_HTTP_ONLY === "true",
      secure: COOKIE_SECURE === "true",
      sameSite: COOKIE_SAME_SITE,
      expires: new Date(0),
    });
    res.cookie(JWT_REFRESH_COOKIE_NAME, "", {
      httpOnly: COOKIE_HTTP_ONLY === "true",
      secure: COOKIE_SECURE === "true",
      sameSite: COOKIE_SAME_SITE,
      expires: new Date(0),
    });

    return res.json({ message: "Logged out from all devices successfully" });
  } catch (error) {
    console.error("Logout All Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

