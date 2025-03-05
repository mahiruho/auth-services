const jwt = require("jsonwebtoken");
// Generate JWT Token
exports.generateJWT = (uid, email) => {
  return jwt.sign({ uid, email }, process.env.JWT_SECRET, {
    expiresIn: parseInt(process.env.JWT_EXPIRES_IN),
  });
};

// Generate Refresh Token
exports.generateRefreshToken = (uid, email) => {
  return jwt.sign({ uid, email }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: parseInt(process.env.JWT_REFRESH_EXPIRES_IN),
  });
};

// Verify JWT Token
exports.verifyJWT = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

// Verify Refresh Token
exports.verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};
