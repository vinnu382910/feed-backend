const express = require("express");
const { verifyToken } = require("../config/firebaseConfig"); // Import verifyToken function
const User = require("../models/user"); // Assuming you have a User model
const router = express.Router();

router.post("/auth/google", async (req, res) => {
  const { idToken } = req.body; // Receive token from frontend

  try {
    const decodedToken = await verifyToken(idToken); // Verify token using Firebase Admin SDK
    const { uid, email, name, picture } = decodedToken; // Extract user details

    // Check if user exists in your database
    let user = await User.findOne({ uid });

    if (!user) {
      // If new user, save to database
      user = await User.create({ uid, email, name, picture });
    }

    res.json({ success: true, user }); // Send authenticated user data
  } catch (error) {
    res.status(401).json({ success: false, error: "Invalid Google Token" });
  }
});

module.exports = router;
