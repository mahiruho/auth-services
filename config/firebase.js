const admin = require("firebase-admin");
const path = require("path");

// Load Firebase Admin credentials from JSON file
const serviceAccount = require(path.join(
  __dirname,
  "firebase-service-account.json"
));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
