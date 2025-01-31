// ../config/firebaseConfig.js
const admin = require("firebase-admin");
const serviceAccount = require("../config/firebase-service-account.json");

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase Admin initialized.");
  }
};

// Function to verify Firebase ID token
const verifyToken = async (token) => {
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return decodedToken; // Return decoded token for further use
  } catch (error) {
    throw new Error("Invalid token");
  }
};

module.exports = { initializeFirebase, verifyToken };
